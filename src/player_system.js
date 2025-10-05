// Player system: movement, facing, regen, and stop helper
// Extracted from main.js to keep orchestration light.

export function createPlayerSystem({ THREE, now, dir2D, distance2D, WORLD, renderer }) {
  /**
   * Stop player: cancel orders and clear any aim previews/cursor state.
   */
  function stopPlayer(player, aimPreview, attackPreview) {
    if (!player) return;
    // cancel movement/attack orders
    player.moveTarget = null;
    player.attackMove = false;
    player.target = null;

    // ensure no aim-related UI or state (aiming removed)
    player.aimMode = false;
    player.aimModeSkill = null;
    try {
      if (aimPreview) aimPreview.visible = false;
      if (attackPreview) attackPreview.visible = false;
      renderer?.domElement && (renderer.domElement.style.cursor = "default");
    } catch (_) {}

    // brief hold to prevent instant re-acquire
    player.holdUntil = now() + 0.4;
  }

  /**
   * Update player physics and facing each frame.
   * ctx = { player, lastMoveDir }
   */
  function updatePlayer(dt, ctx) {
    const { player, lastMoveDir } = ctx;
    if (!player) return;

    // Regen
    player.hp = Math.min(player.maxHP, player.hp + player.hpRegen * dt);
    player.mp = Math.min(player.maxMP, player.mp + player.mpRegen * dt);
    player.idlePhase += dt;

    // Dead state
    if (!player.alive) {
      player.mesh.position.y = 1.1;
      return;
    }

    // Freeze: no movement
    if (player.frozen) {
      player.mesh.position.y = 1.1;
      return;
    }

    // Attack-move: user-initiated attack-move is respected but automatic acquisition/auto-attack is disabled.
    // Intentionally left blank here to avoid auto-acquiring targets while attack-moving.

    // Movement towards target or moveTarget
    let moveDir = null;
    if (player.target && player.target.alive) {
      const d = distance2D(player.pos(), player.target.pos());
      // Do NOT auto-move or auto-basic-attack when a target is set.
      // If the player explicitly used attack-move then allow moving toward the target.
      if (player.attackMove && d > (WORLD.attackRange * (WORLD.attackRangeMult || 1)) * 0.95) {
        moveDir = dir2D(player.pos(), player.target.pos());
      } else {
        // Only auto-face the target when nearby (no auto-attack).
        if (d <= (WORLD.attackRange * (WORLD.attackRangeMult || 1)) * 1.5) {
          const v = dir2D(player.pos(), player.target.pos());
          const targetYaw = Math.atan2(v.x, v.z);
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetYaw, 0));
          player.mesh.quaternion.slerp(q, Math.min(1, player.turnSpeed * 1.5 * dt));
          player.lastFacingYaw = targetYaw;
          player.lastFacingUntil = now() + 0.6;
        }
      }
    } else if (player.moveTarget) {
      const d = distance2D(player.pos(), player.moveTarget);
      if (d > 0.6) {
        moveDir = dir2D(player.pos(), player.moveTarget);
      } else {
        player.moveTarget = null;
      }
    }

    if (moveDir) {
      const spMul = (player.speedBoostUntil && now() < player.speedBoostUntil && player.speedBoostMul) ? player.speedBoostMul : 1;
      const effSpeed = player.speed * spMul;
      player.mesh.position.x += moveDir.x * effSpeed * dt;
      player.mesh.position.z += moveDir.z * effSpeed * dt;

      // Rotate towards movement direction smoothly
      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      const euler = new THREE.Euler(0, targetYaw, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      player.mesh.quaternion.slerp(q, Math.min(1, player.turnSpeed * dt));

      // record move direction for camera look-ahead
      lastMoveDir.set(moveDir.x, 0, moveDir.z);
    } else {
      // stationary: face current target if any, or keep last facing for a short while
      if (player.target && player.target.alive) {
        const v = dir2D(player.pos(), player.target.pos());
        const targetYaw = Math.atan2(v.x, v.z);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetYaw, 0));
        player.mesh.quaternion.slerp(q, Math.min(1, player.turnSpeed * 1.5 * dt));
        player.lastFacingYaw = targetYaw;
        player.lastFacingUntil = now() + 0.6;
      } else if (player.lastFacingUntil && now() < player.lastFacingUntil) {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, player.lastFacingYaw || 0, 0));
        player.mesh.quaternion.slerp(q, Math.min(1, player.turnSpeed * 0.8 * dt));
      }
      // decay look-ahead
      lastMoveDir.multiplyScalar(Math.max(0, 1 - dt * 3));
    }

    // Keep y at ground
    player.mesh.position.y = 1.1;

    // Idle glow pulse and brief brace squash
    const ud = player.mesh.userData || {};
    if (ud.handLight) ud.handLight.intensity = 1.2 + Math.sin((player.idlePhase || 0) * 2.2) * 0.22;
    if (ud.fireOrb && ud.fireOrb.material) {
      ud.fireOrb.material.emissiveIntensity = 2.2 + Math.sin((player.idlePhase || 0) * 2.2) * 0.35;
    }
    if (player.braceUntil && now() < player.braceUntil) {
      const n = Math.max(0, (player.braceUntil - now()) / 0.18);
      player.mesh.scale.set(1, 0.94 + 0.06 * n, 1);
    } else {
      player.mesh.scale.set(1, 1, 1);
    }
  }

  return { stopPlayer, updatePlayer };
}
