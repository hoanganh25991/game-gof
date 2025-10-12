/**
 * Enemies System
 * - Updates enemy AI, movement, attacks, death/respawn, despawn, and HP bar billboarding.
 * - Mobile culling: freezes enemies beyond a cull distance to save CPU on low-end devices.
 * - VFX gating: defers heavy effects based on performance tracker policy provided by main.
 * - Spatial partitioning: Uses spatial grid to reduce collision checks from O(n²) to O(n log n)
 *
 * Public API:
 *   import { EnemiesSystem } from './enemies_system.js';
 *   const enemiesSystem = new EnemiesSystem(deps);
 *   enemiesSystem.update(dt, { aiStride, bbStride, bbOffset });
 *
 * Module boundaries:
 * - No direct DOM access
 * - No reliance on globals (all deps injected)
 * - No raycast coupling
 */

import { THEME_COLORS } from "../config/index.js";
import { SpatialGrid } from "./spatial-grid.js";

export class EnemiesSystem {
  // Private fields for dependencies
  #THREE;
  #WORLD;
  #VILLAGE_POS;
  #REST_RADIUS;
  #dir2D;
  #distance2D;
  #now;
  #audio;
  #effects;
  #scene;
  #player;
  #enemies;
  #villages;
  #mapManager;
  #isMobile;
  #MOBILE_OPTIMIZATIONS;
  #camera;
  #shouldSpawnVfx;
  #applyMapModifiersToEnemy;
  #chunkMgr;

  // Private fields for reusable temp vectors
  #tempA;
  #tempB;
  #tempC;

  // Private fields for mobile culling
  #CULL_CHECK_INTERVAL = 0.5; // seconds
  #lastCullCheckT = 0;
  #frozenEnemies = new Set();

  // Private field for AI stride offset
  #aiOffset = 0;

  // Private field for spatial partitioning
  #spatialGrid;

  constructor({
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
    shouldSpawnVfx,
    applyMapModifiersToEnemy,
    chunkMgr,
  }) {
    // Store all dependencies as private fields
    this.#THREE = THREE;
    this.#WORLD = WORLD;
    this.#VILLAGE_POS = VILLAGE_POS;
    this.#REST_RADIUS = REST_RADIUS;
    this.#dir2D = dir2D;
    this.#distance2D = distance2D;
    this.#now = now;
    this.#audio = audio;
    this.#effects = effects;
    this.#scene = scene;
    this.#player = player;
    this.#enemies = enemies;
    this.#villages = villages;
    this.#mapManager = mapManager;
    this.#isMobile = isMobile;
    this.#MOBILE_OPTIMIZATIONS = MOBILE_OPTIMIZATIONS;
    this.#camera = camera;
    this.#shouldSpawnVfx = shouldSpawnVfx;
    this.#applyMapModifiersToEnemy = applyMapModifiersToEnemy;
    this.#chunkMgr = chunkMgr;

    // Initialize reusable temps (avoid allocations in hot path)
    this.#tempA = new THREE.Vector3();
    this.#tempB = new THREE.Vector3();
    this.#tempC = new THREE.Vector3();

    // Initialize spatial grid for efficient proximity queries
    // Cell size of 25 units provides optimal clustering for ~100 enemies
    // Larger cells = fewer occupied cells = better efficiency
    // World size of 500 covers the typical play area
    this.#spatialGrid = new SpatialGrid({ cellSize: 25, worldSize: 500 });
  }

  /**
   * Generate random enemy spawn position around player, avoiding villages
   * @private
   * @returns {THREE.Vector3} Spawn position
   */
  #randomEnemySpawnPos() {
    // Spawn around player, avoid village rest radii (origin and discovered)
    const angle = Math.random() * Math.PI * 2;
    const minR = this.#WORLD.enemySpawnMinRadius || 30;
    const maxR = this.#WORLD.enemySpawnRadius || 220;
    const r = minR + Math.random() * (maxR - minR);

    const center = this.#player.pos();
    const cand = new this.#THREE.Vector3(
      center.x + Math.cos(angle) * r,
      0,
      center.z + Math.sin(angle) * r
    );

    // Keep out of origin village rest radius
    const dvx = cand.x - this.#VILLAGE_POS.x;
    const dvz = cand.z - this.#VILLAGE_POS.z;
    const dVillage = Math.hypot(dvx, dvz);
    if (dVillage < this.#REST_RADIUS + 2) {
      const push = (this.#REST_RADIUS + 2) - dVillage + 0.5;
      const nx = dvx / (dVillage || 1);
      const nz = dvz / (dVillage || 1);
      cand.x += nx * push;
      cand.z += nz * push;
    }

    // Keep out of any discovered dynamic village rest radius
    try {
      const list = this.#villages?.listVillages?.() || [];
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

  /**
   * Update mobile culling state
   * @private
   */
  #updateMobileCulling() {
    if (!this.#isMobile || !this.#MOBILE_OPTIMIZATIONS.cullDistance) return;

    const t = this.#now();
    if (t - this.#lastCullCheckT <= this.#CULL_CHECK_INTERVAL) return;

    this.#lastCullCheckT = t;
    this.#frozenEnemies.clear();
    const cullDist = this.#MOBILE_OPTIMIZATIONS.cullDistance;
    const playerPos = this.#player.pos();
    
    for (const en of this.#enemies) {
      if (!en.alive) continue;
      const dist = this.#distance2D(en.pos(), playerPos);
      if (dist > cullDist) {
        this.#frozenEnemies.add(en);
        // Stop their movement target to save cycles
        en.moveTarget = null;
      }
    }
  }

  /**
   * Enforce structure protection zones
   * @private
   */
  #enforceStructureProtection(en) {
    if (!this.#chunkMgr) return;

    try {
      const structuresAPI = this.#chunkMgr.getStructuresAPI();
      if (!structuresAPI) return;

      const structures = structuresAPI.listStructures();
      for (const s of structures) {
        const protectionRadius = s.protectionRadius || 8;
        const currentDist = Math.hypot(en.mesh.position.x - s.position.x, en.mesh.position.z - s.position.z);
        
        // If enemy is inside protection zone, push them out immediately
        if (currentDist < protectionRadius) {
          const dirFromStructure = this.#dir2D(s.position, en.pos());
          en.mesh.position.x = s.position.x + dirFromStructure.x * protectionRadius;
          en.mesh.position.z = s.position.z + dirFromStructure.z * protectionRadius;
          // Also clear their attack cooldown so they don't attack from the boundary
          if (en.nextAttackReady) {
            en.nextAttackReady = this.#now() + (en.attackCooldown || this.#WORLD.aiAttackCooldown);
          }
          break;
        }
      }
    } catch (_) {}
  }

  /**
   * Process enemy chase and attack behavior
   * @private
   */
  #processChaseAndAttack(en, toPlayer, dt) {
    const d = toPlayer;
    const ar = en.attackRange || this.#WORLD.aiAttackRange;
    
    if (d > ar) {
      // Chase player
      this.#processChaseMovement(en, dt);
    } else {
      // Attack player
      this.#processAttack(en);
    }
  }

  /**
   * Process chase movement with collision avoidance
   * @private
   */
  #processChaseMovement(en, dt) {
    const v = this.#dir2D(en.pos(), this.#player.pos());
    const spMul = en.slowUntil && this.#now() < en.slowUntil ? en.slowFactor || 0.5 : 1;

    // Apply enemy-to-enemy separation using spatial grid (O(n log n) instead of O(n²))
    const separationForce = this.#calculateSeparationForce(en);
    
    // Combine chase direction with separation force
    const finalDir = {
      x: v.x + separationForce.x * 0.5, // Separation has 50% influence
      z: v.z + separationForce.z * 0.5
    };
    
    // Normalize the final direction
    const mag = Math.hypot(finalDir.x, finalDir.z);
    if (mag > 0.001) {
      finalDir.x /= mag;
      finalDir.z /= mag;
    }

    // Next tentative position
    let nx = en.mesh.position.x + finalDir.x * en.speed * spMul * dt;
    let nz = en.mesh.position.z + finalDir.z * en.speed * spMul * dt;

    // Clamp to fences (origin village)
    const nextDistToVillage = Math.hypot(nx - this.#VILLAGE_POS.x, nz - this.#VILLAGE_POS.z);
    if (nextDistToVillage <= this.#REST_RADIUS - 0.25) {
      const dirFromVillage = this.#dir2D(this.#VILLAGE_POS, en.pos());
      en.mesh.position.x = this.#VILLAGE_POS.x + dirFromVillage.x * (this.#REST_RADIUS - 0.25);
      en.mesh.position.z = this.#VILLAGE_POS.z + dirFromVillage.z * (this.#REST_RADIUS - 0.25);
    } else {
      // Check dynamic villages and structures
      const clamped = this.#checkCollisions(en, nx, nz);
      if (!clamped) {
        en.mesh.position.x = nx;
        en.mesh.position.z = nz;
      }
    }
    
    // Face direction (use original chase direction for orientation)
    const yaw = Math.atan2(v.x, v.z);
    const q = new this.#THREE.Quaternion().setFromEuler(new this.#THREE.Euler(0, yaw, 0));
    en.mesh.quaternion.slerp(q, 0.2);
  }

  /**
   * Calculate separation force from nearby enemies using spatial grid
   * This reduces collision checks from O(n²) to O(n log n)
   * @private
   * @param {Object} en - Enemy to calculate separation for
   * @returns {{x: number, z: number}} Separation force vector
   */
  #calculateSeparationForce(en) {
    const separationRadius = 2.5; // Min distance to maintain from other enemies
    const nearby = this.#spatialGrid.getNearby(en.pos(), separationRadius);
    
    let forceX = 0;
    let forceZ = 0;
    let count = 0;
    
    for (const other of nearby) {
      // Skip self
      if (other === en) continue;
      
      const dx = en.mesh.position.x - other.mesh.position.x;
      const dz = en.mesh.position.z - other.mesh.position.z;
      const distSq = dx * dx + dz * dz;
      
      // Apply stronger force when closer
      if (distSq < separationRadius * separationRadius && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const strength = (separationRadius - dist) / separationRadius; // 0 to 1
        
        forceX += (dx / dist) * strength;
        forceZ += (dz / dist) * strength;
        count++;
      }
    }
    
    // Average the separation force
    if (count > 0) {
      forceX /= count;
      forceZ /= count;
    }
    
    return { x: forceX, z: forceZ };
  }

  /**
   * Check and handle collisions with villages and structures
   * @private
   * @returns {boolean} True if position was clamped
   */
  #checkCollisions(en, nx, nz) {
    const nextPos = this.#tempA.set(nx, 0, nz);
    let clamped = false;
    
    // Check dynamic villages
    try {
      const inside = this.#villages?.isInsideAnyVillage?.(nextPos);
      if (inside && inside.inside && inside.key !== "origin") {
        const dirFrom = this.#dir2D(inside.center, en.pos());
        const rad = Math.max(0.25, (inside.radius || this.#REST_RADIUS) - 0.25);
        en.mesh.position.x = inside.center.x + dirFrom.x * rad;
        en.mesh.position.z = inside.center.z + dirFrom.z * rad;
        clamped = true;
      }
    } catch (_) {}
    
    // Check structure protection zones
    if (!clamped && this.#chunkMgr) {
      try {
        const structuresAPI = this.#chunkMgr.getStructuresAPI();
        if (structuresAPI) {
          const structures = structuresAPI.listStructures();
          for (const s of structures) {
            const protectionRadius = s.protectionRadius || 8;
            const currentDist = Math.hypot(en.mesh.position.x - s.position.x, en.mesh.position.z - s.position.z);
            const nextDist = Math.hypot(nx - s.position.x, nz - s.position.z);
            
            // If enemy is currently inside or would enter, push them to the boundary
            if (currentDist < protectionRadius || nextDist < protectionRadius) {
              const dirFromStructure = this.#dir2D(s.position, en.pos());
              en.mesh.position.x = s.position.x + dirFromStructure.x * protectionRadius;
              en.mesh.position.z = s.position.z + dirFromStructure.z * protectionRadius;
              clamped = true;
              break;
            }
          }
        }
      } catch (_) {}
    }
    
    return clamped;
  }

  /**
   * Process enemy attack
   * @private
   */
  #processAttack(en) {
    const t = this.#now();
    if (t < (en.nextAttackReady || 0)) return;

    const cd = en.attackCooldown || this.#WORLD.aiAttackCooldown;
    en.nextAttackReady = t + cd;

    // Effect origin/target
    const from = this.#tempA.copy(en.pos()).add(this.#tempB.set(0, 1.4, 0));
    const to = this.#tempC.copy(this.#player.pos()).add(this.#tempB.set(0, 1.2, 0));

    try {
      if (en.attackEffect === "melee") {
        // lightweight strike
        try { this.#effects.spawnStrike(this.#player.pos(), 0.9, THEME_COLORS.themeAccent); } catch (_) {}
      } else if (en.attackEffect === "fire") {
        if (this.#shouldSpawnVfx && this.#shouldSpawnVfx("fire", from)) {
          this.#effects.spawnProjectile(from.clone(), to.clone(), {
            color: en.beamColor || THEME_COLORS.themeLightOrange,
            size: 0.3,
            speed: 20,
            onComplete: (hitPos) => {
              this.#effects.spawnHitDecal(hitPos, 0.8, THEME_COLORS.themeOrange);
            }
          });
        }
      } else {
        // default ranged
        if (this.#shouldSpawnVfx && this.#shouldSpawnVfx("largeBeam", from)) {
          this.#effects.spawnProjectile(from.clone(), to.clone(), {
            color: en.beamColor || THEME_COLORS.themeLightOrange,
            size: 0.25,
            speed: 22,
            onComplete: (hitPos) => {
              this.#effects.spawnHitDecal(hitPos, THEME_COLORS.themeOrange);
            }
          });
        }
      }
    } catch (_) {}
    
    // Apply damage
    this.#player.takeDamage(en.attackDamage);
    try { this.#audio.sfx("player_hit"); } catch (_) {}
    try { this.#effects.spawnDamagePopup(this.#player.pos(), en.attackDamage, THEME_COLORS.textWarm); } catch (_) {}
  }

  /**
   * Process enemy wander behavior
   * @private
   */
  #processWander(en, dt) {
    if (!en.moveTarget || Math.random() < 0.005) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * this.#WORLD.aiWanderRadius;
      this.#tempA.copy(en.pos()).add(this.#tempB.set(Math.cos(ang) * r, 0, Math.sin(ang) * r));
      en.moveTarget = this.#tempA.clone();
    }
    
    const d = this.#distance2D(en.pos(), en.moveTarget);
    if (d > 0.8) {
      const v = this.#dir2D(en.pos(), en.moveTarget);
      const spMul = en.slowUntil && this.#now() < en.slowUntil ? en.slowFactor || 0.5 : 1;
      en.mesh.position.x += v.x * en.speed * spMul * 0.6 * dt;
      en.mesh.position.z += v.z * en.speed * spMul * 0.6 * dt;
    }
  }

  /**
   * Handle enemy death and respawn
   * @private
   */
  #handleDeathAndRespawn(en) {
    if (!en._xpGranted) {
      try { this.#audio.sfx("enemy_die"); } catch (_) {}
      en._xpGranted = true;
      this.#player.gainXP(en.xpOnDeath);
      en._respawnAt = this.#now() + (this.#WORLD.enemyRespawnDelay || 8);
    }
    
    // Handle respawn to maintain enemy density
    if (en._respawnAt && this.#now() >= en._respawnAt) {
      const pos = this.#randomEnemySpawnPos();
      en.respawn(pos, this.#player.level);
      try { 
        this.#applyMapModifiersToEnemy && this.#applyMapModifiersToEnemy(en); 
      } catch (_) {}
    }
  }

  /**
   * Main update loop for all enemies
   * @param {number} dt - Delta time in seconds
   * @param {Object} options - Update options
   * @param {number} options.aiStride - AI update stride (default: 1)
   * @param {number} options.bbStride - Billboard update stride (default: 2)
   * @param {number} options.bbOffset - Billboard offset (default: 0)
   */
  update(dt, { aiStride = 1, bbStride = 2, bbOffset = 0 } = {}) {
    aiStride = Math.max(1, aiStride);
    bbStride = Math.max(1, bbStride);

    this.#aiOffset = (this.#aiOffset + 1) % aiStride;

    // Rebuild spatial grid for this frame
    this.#spatialGrid.clear();
    for (const en of this.#enemies) {
      if (en && en.alive && !en._despawned) {
        this.#spatialGrid.insert(en);
      }
    }

    // Mobile: periodic culling update
    this.#updateMobileCulling();

    // Main enemy loop
    for (let i = 0; i < this.#enemies.length; i++) {
      const en = this.#enemies[i];

      // Skip if enemy removed
      if (!en) continue;

      // Skip AI for frozen enemies; still billboard occasionally
      if (this.#isMobile && this.#frozenEnemies.has(en)) {
        if ((i % bbStride) === bbOffset && en.hpBar?.container) {
          en.hpBar.container.lookAt(this.#camera.position);
        }
        continue;
      }

      // AI stride throttling
      if ((i % aiStride) !== this.#aiOffset) {
        // Still billboard throttled to keep bars legible
        if ((i % bbStride) === bbOffset && en?.alive && en.hpBar?.container) {
          en.hpBar.container.lookAt(this.#camera.position);
        }
        continue;
      }

      // Handle dead enemies
      if (!en.alive) {
        this.#handleDeathAndRespawn(en);
        continue;
      }

      const toPlayer = this.#player.alive ? this.#distance2D(en.pos(), this.#player.pos()) : Infinity;

      // Despawn very far enemies
      const DESPAWN_DIST = (this.#WORLD?.dynamicSpawn?.despawnRadius) || ((this.#WORLD.enemySpawnRadius || 220) * 1.6);
      if (toPlayer > DESPAWN_DIST) {
        try { this.#scene.remove(en.mesh); } catch (_) {}
        en._despawned = true;
        continue;
      }

      // ALWAYS enforce structure protection zones
      this.#enforceStructureProtection(en);

      // Process AI behavior
      if (toPlayer < this.#WORLD.aiAggroRadius) {
        this.#processChaseAndAttack(en, toPlayer, dt);
      } else {
        this.#processWander(en, dt);
      }

      // keep y at fixed height
      en.mesh.position.y = 1.0;

      // Update HP bar
      try { en.updateHPBar && en.updateHPBar(); } catch (_) {}

      // Death handling (duplicate-guard)
      if (!en.alive && !en._xpGranted) {
        try { this.#audio.sfx("enemy_die"); } catch (_) {}
        en._xpGranted = true;
        this.#player.gainXP(en.xpOnDeath);
        en._respawnAt = this.#now() + (this.#WORLD.enemyRespawnDelay || 8);
      }

      // Throttled billboarding
      if ((i % bbStride) === bbOffset && en.hpBar?.container) {
        en.hpBar.container.lookAt(this.#camera.position);
      }
    }

    // Cleanup: remove despawned enemies
    for (let i = this.#enemies.length - 1; i >= 0; i--) {
      const e = this.#enemies[i];
      if (e && e._despawned) {
        this.#enemies.splice(i, 1);
      }
    }
  }

  /**
   * Get frozen enemies set (for debugging/profiling)
   * @returns {Set} Set of frozen enemy references
   */
  getFrozenEnemies() {
    return this.#frozenEnemies;
  }

  /**
   * Get spatial grid statistics (for debugging/profiling)
   * @returns {Object} Grid statistics including checks saved
   */
  getSpatialGridStats() {
    const aliveEnemies = this.#enemies.filter(e => e && e.alive && !e._despawned).length;
    return {
      ...this.#spatialGrid.getStats(),
      efficiency: this.#spatialGrid.getEfficiency(aliveEnemies),
      aliveEnemies
    };
  }
}

// Backward compatibility: export factory function
export function createEnemiesSystem(deps) {
  return new EnemiesSystem(deps);
}
