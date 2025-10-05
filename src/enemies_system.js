/**
 * Enemies System
 * - Updates enemy AI, movement, attacks, death/respawn, despawn, and HP bar billboarding.
 * - Mobile culling: freezes enemies beyond a cull distance to save CPU on low-end devices.
 * - VFX gating: defers heavy effects based on performance tracker policy provided by main.
 *
 * Public API:
 *   const enemiesSystem = createEnemiesSystem(deps)
 *   enemiesSystem.update(dt, { aiStride, bbStride, bbOffset })
 *
 * Module boundaries:
 * - No direct DOM access
 * - No reliance on globals (all deps injected)
 * - No raycast coupling
 */

export function createEnemiesSystem({
  THREE,
  WORLD,
  VILLAGE_POS,
  REST_RADIUS,
  dir2D,
  distance2D,
  now,
  audio,
  effects,
  scene,
  player,
  enemies,
  villages,
  mapManager,
  isMobile,
  MOBILE_OPTIMIZATIONS,
  camera,
  shouldSpawnVfx, // (kind, pos) => boolean
  applyMapModifiersToEnemy, // (enemy) => void
}) {
  // Reusable temps (avoid allocations in hot path)
  const tA = new THREE.Vector3();
  const tB = new THREE.Vector3();
  const tC = new THREE.Vector3();

  // Mobile culling
  const CULL_CHECK_INTERVAL = 0.5; // seconds
  let lastCullCheckT = 0;
  const frozenEnemies = new Set();

  // AI stride offset (throttling)
  let aiOffset = 0;

  function randomEnemySpawnPos() {
    // Spawn around player, avoid village rest radii (origin and discovered)
    const angle = Math.random() * Math.PI * 2;
    const minR = WORLD.enemySpawnMinRadius || 30;
    const maxR = WORLD.enemySpawnRadius || 220;
    const r = minR + Math.random() * (maxR - minR);

    const center = player.pos();
    const cand = new THREE.Vector3(
      center.x + Math.cos(angle) * r,
      0,
      center.z + Math.sin(angle) * r
    );

    // Keep out of origin village rest radius
    const dvx = cand.x - VILLAGE_POS.x;
    const dvz = cand.z - VILLAGE_POS.z;
    const dVillage = Math.hypot(dvx, dvz);
    if (dVillage < REST_RADIUS + 2) {
      const push = (REST_RADIUS + 2) - dVillage + 0.5;
      const nx = dvx / (dVillage || 1);
      const nz = dvz / (dVillage || 1);
      cand.x += nx * push;
      cand.z += nz * push;
    }

    // Keep out of any discovered dynamic village rest radius
    try {
      const list = villages?.listVillages?.() || [];
      for (const v of list) {
        const dvx2 = cand.x - v.center.x;
        const dvz2 = cand.z - v.center.z;
        const d2 = Math.hypot(dvx2, dvz2);
        const r2 = (v.radius || 0) + 2;
        if (d2 < r2) {
          const nx2 = dvx2 / (d2 || 1);
          const nz2 = dvz2 / (d2 || 1);
          const push2 = r2 - d2 + 0.5;
          cand.x += nx2 * push2;
          cand.z += nz2 * push2;
        }
      }
    } catch (_) {}

    return cand;
  }

  function update(dt, { aiStride = 1, bbStride = 2, bbOffset = 0 } = {}) {
    aiStride = Math.max(1, aiStride);
    bbStride = Math.max(1, bbStride);

    aiOffset = (aiOffset + 1) % aiStride;

    // Mobile: periodic culling update
    if (isMobile && MOBILE_OPTIMIZATIONS.cullDistance) {
      const t = now();
      if (t - lastCullCheckT > CULL_CHECK_INTERVAL) {
        lastCullCheckT = t;
        frozenEnemies.clear();
        const cullDist = MOBILE_OPTIMIZATIONS.cullDistance;
        const playerPos = player.pos();
        for (const en of enemies) {
          if (!en.alive) continue;
          const dist = distance2D(en.pos(), playerPos);
          if (dist > cullDist) {
            frozenEnemies.add(en);
            // Stop their movement target to save cycles
            en.moveTarget = null;
          }
        }
      }
    }

    // Main enemy loop
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];

      // Skip billboarding and AI if enemy removed
      if (!en) continue;

      // Skip AI for frozen enemies; still billboard occasionally
      if (isMobile && frozenEnemies.has(en)) {
        if ((i % bbStride) === bbOffset && en.hpBar?.container) {
          en.hpBar.container.lookAt(camera.position);
        }
        continue;
      }

      // AI stride throttling
      if ((i % aiStride) !== aiOffset) {
        // Still billboard throttled to keep bars legible
        if ((i % bbStride) === bbOffset && en?.alive && en.hpBar?.container) {
          en.hpBar.container.lookAt(camera.position);
        }
        continue;
      }

      if (!en.alive) {
        // Death cleanup, SFX, and XP grant + schedule respawn
        if (!en._xpGranted) {
          try { audio.sfx("enemy_die"); } catch (_) {}
          en._xpGranted = true;
          player.gainXP(en.xpOnDeath);
          en._respawnAt = now() + (WORLD.enemyRespawnDelay || 8);
        }
        // Handle respawn to maintain enemy density; scale with hero level
        if (en._respawnAt && now() >= en._respawnAt) {
          const pos = randomEnemySpawnPos();
          en.respawn(pos, player.level);
          try { applyMapModifiersToEnemy && applyMapModifiersToEnemy(en); } catch (_) {}
        }
        continue;
      }

      const toPlayer = player.alive ? distance2D(en.pos(), player.pos()) : Infinity;

      // Despawn very far enemies; rely on spawner to refill density closer to the player
      const DESPAWN_DIST =
        (WORLD?.dynamicSpawn?.despawnRadius) ||
        ((WORLD.enemySpawnRadius || 220) * 1.6);
      if (toPlayer > DESPAWN_DIST) {
        try { scene.remove(en.mesh); } catch (_) {}
        en._despawned = true;
        continue;
      }

      if (toPlayer < WORLD.aiAggroRadius) {
        // Chase player
        const d = toPlayer;
        const ar = en.attackRange || WORLD.aiAttackRange;
        if (d > ar) {
          const v = dir2D(en.pos(), player.pos());
          const spMul = en.slowUntil && now() < en.slowUntil ? en.slowFactor || 0.5 : 1;

          // Next tentative
          const nx = en.mesh.position.x + v.x * en.speed * spMul * dt;
          const nz = en.mesh.position.z + v.z * en.speed * spMul * dt;

          // Clamp to fences (origin village)
          const nextDistToVillage = Math.hypot(nx - VILLAGE_POS.x, nz - VILLAGE_POS.z);
          if (nextDistToVillage <= REST_RADIUS - 0.25) {
            const dirFromVillage = dir2D(VILLAGE_POS, en.pos());
            en.mesh.position.x = VILLAGE_POS.x + dirFromVillage.x * (REST_RADIUS - 0.25);
            en.mesh.position.z = VILLAGE_POS.z + dirFromVillage.z * (REST_RADIUS - 0.25);
          } else {
            // Check dynamic villages
            const nextPos = tA.set(nx, 0, nz);
            let clamped = false;
            try {
              const inside = villages?.isInsideAnyVillage?.(nextPos);
              if (inside && inside.inside && inside.key !== "origin") {
                const dirFrom = dir2D(inside.center, en.pos());
                const rad = Math.max(0.25, (inside.radius || REST_RADIUS) - 0.25);
                en.mesh.position.x = inside.center.x + dirFrom.x * rad;
                en.mesh.position.z = inside.center.z + dirFrom.z * rad;
                clamped = true;
              }
            } catch (_) {}
            if (!clamped) {
              en.mesh.position.x = nx;
              en.mesh.position.z = nz;
            }
          }
          // Face direction
          const yaw = Math.atan2(v.x, v.z);
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
          en.mesh.quaternion.slerp(q, 0.2);
        } else {
          // Attack player
          const t = now();
          if (t >= (en.nextAttackReady || 0)) {
            const cd = en.attackCooldown || WORLD.aiAttackCooldown;
            en.nextAttackReady = t + cd;

            // Effect origin/target (reuse temps)
            tA.copy(en.pos()).add(tB.set(0, 1.4, 0)); // from
            tC.copy(player.pos()).add(tB.set(0, 1.2, 0)); // to

            try {
              if (en.attackEffect === "melee") {
                // lightweight strike
                try { effects.spawnStrike(player.pos(), 0.9, 0xff9955); } catch (_) {}
              } else if (en.attackEffect === "fire") {
                if (shouldSpawnVfx && shouldSpawnVfx("fire", tA)) {
                  effects.spawnFireball(tA.clone(), tC.clone(), {
                    color: en.beamColor || 0xff6347,
                    size: 0.3,
                    speed: 20,
                    onComplete: (hitPos) => {
                      effects.spawnStrike(hitPos, 0.8, en.beamColor || 0xff6347);
                    }
                  });
                }
              } else {
                // default ranged
                if (shouldSpawnVfx && shouldSpawnVfx("largeBeam", tA)) {
                  effects.spawnFireball(tA.clone(), tC.clone(), {
                    color: en.beamColor || 0xff8080,
                    size: 0.25,
                    speed: 22,
                    onComplete: (hitPos) => {
                      effects.spawnHitDecal(hitPos, 0xff4500);
                    }
                  });
                }
              }
            } catch (_) {}
            // Apply damage
            player.takeDamage(en.attackDamage);
            try { audio.sfx("player_hit"); } catch (_) {}
            try { effects.spawnDamagePopup(player.pos(), en.attackDamage, 0xffd0d0); } catch (_) {}
          }
        }
      } else {
        // Wander around their spawn origin
        if (!en.moveTarget || Math.random() < 0.005) {
          const ang = Math.random() * Math.PI * 2;
          const r = Math.random() * WORLD.aiWanderRadius;
          tA.copy(en.pos()).add(tB.set(Math.cos(ang) * r, 0, Math.sin(ang) * r));
          en.moveTarget = tA.clone();
        }
        const d = distance2D(en.pos(), en.moveTarget);
        if (d > 0.8) {
          const v = dir2D(en.pos(), en.moveTarget);
          const spMul = en.slowUntil && now() < en.slowUntil ? en.slowFactor || 0.5 : 1;
          en.mesh.position.x += v.x * en.speed * spMul * 0.6 * dt;
          en.mesh.position.z += v.z * en.speed * spMul * 0.6 * dt;
        }
      }

      // keep y at fixed height
      en.mesh.position.y = 1.0;

      // Update HP bar
      try { en.updateHPBar && en.updateHPBar(); } catch (_) {}

      // Death handling (duplicate-guard)
      if (!en.alive && !en._xpGranted) {
        try { audio.sfx("enemy_die"); } catch (_) {}
        en._xpGranted = true;
        player.gainXP(en.xpOnDeath);
        en._respawnAt = now() + (WORLD.enemyRespawnDelay || 8);
      }

      // Throttled billboarding
      if ((i % bbStride) === bbOffset && en.hpBar?.container) {
        en.hpBar.container.lookAt(camera.position);
      }
    }

    // Cleanup: remove despawned enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e && e._despawned) {
        enemies.splice(i, 1);
      }
    }
  }

  return {
    update,
    // Expose for debugging/profiling if needed
    _frozen: frozenEnemies,
  };
}
