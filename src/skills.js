import * as THREE from "../vendor/three/build/three.module.js";
import { audio } from "./audio.js";
import { COLOR, FX, REST_RADIUS, SCALING, VILLAGE_POS, WORLD } from "./constants.js";
import { handWorldPos } from "./entities.js";
import { getSkill } from "./skill_api.js";
import { SKILL_FX } from "./skills_fx.js";
import { getBasicUplift } from "./uplift.js";
import { distance2D, now } from "./utils.js";

/**
 * SkillsSystem centralizes cooldowns, basic attack, Q/W/E/R skills,
 */
const __vA = new THREE.Vector3();
const __vB = new THREE.Vector3();
const __vC = new THREE.Vector3();

export class SkillsSystem {
  /**
   * @param {import("./entities.js").Player} player
   * @param {import("./entities.js").Enemy[]} enemies
   * @param {import("./effects_manager.js").EffectsManager} effects
   * @param {{Q: HTMLElement, W: HTMLElement, E: HTMLElement, R: HTMLElement}} cdUI
   * @param {any} villages optional villages system to enforce village safety rules
   */
  constructor(player, enemies, effects, cdUI, villages = null) {
    this.player = player;
    this.enemies = enemies;
    this.effects = effects;
    this.cdUI = cdUI;
    this.villages = villages;

    this.cooldowns = { Q: 0, W: 0, E: 0, R: 0, Basic: 0 };
    this.cdState = { Q: 0, W: 0, E: 0, R: 0, Basic: 0 }; // for ready flash timing
    // Temporary damage buff (applies to basic + skills)
    this.damageBuffUntil = 0;
    this.damageBuffMult = 1;
    this._pendingShake = 0;
  }

  // ----- Damage scaling helpers -----
  getBasicDamage(attacker) {
    let base = WORLD.basicAttackDamage;
    if (attacker && typeof attacker.baseDamage === "number") {
      base = Math.max(1, Math.floor(attacker.baseDamage));
    }
    const activeBuff = this.damageBuffUntil && now() < this.damageBuffUntil ? this.damageBuffMult || 1 : 1;
    return Math.max(1, Math.floor(base * activeBuff));
  }

  scaleSkillDamage(base) {
    const lvl = Math.max(1, (this.player && this.player.level) || 1);
    const levelMult = Math.pow(SCALING.hero.skillDamageGrowth, lvl - 1);
    const buffMult = this.damageBuffUntil && now() < this.damageBuffUntil ? this.damageBuffMult || 1 : 1;
    return Math.max(1, Math.floor((base || 0) * levelMult * buffMult));
  }

  // VFX helpers driven by SKILL_FX configuration (moved out of skills_pool)
  _fx(def) {
    const id = def && def.id;
    const e = (id && SKILL_FX[id]) || {};
    return {
      beam: e.beam ?? COLOR.fire, // Orange-red fire beam
      impact: e.impact ?? COLOR.midFire, // Tomato red impact
      ring: e.ring ?? COLOR.ember, // Ember orange ring
      arc: e.arc ?? COLOR.arc, // Bright orange arc
      hand: e.hand ?? COLOR.ember, // Ember orange hand
      shake: e.shake ?? 0,
    };
  }

  _vfxCastFlash(def) {
    const fx = this._fx(def);
    try {
      const handPos = this.player.mesh.userData.handAnchor ? handWorldPos(this.player) : this.player.pos().clone().add(new THREE.Vector3(0, 1.6, 0));
      this.effects.spawnRing(handPos, 0.5, fx.hand, 0.2);
      this.effects.spawnImpact(handPos, 1, fx.hand);
    } catch (_) { }
  }

  _requestShake(v) {
    this._pendingShake = Math.max(this._pendingShake || 0, v || 0);
  }

  // Burst arcs around a center point to enrich visuals (color-tinted)
  _burstArcs(center, radius, def, count = 3) {
    try {
      const fx = this._fx(def);
      const base = __vA.copy(center).add(__vB.set(0, 0.8, 0)).clone();
      for (let i = 0; i < Math.max(1, count); i++) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * Math.max(4, radius);
        const to = __vA
          .copy(center)
          .add(__vC.set(Math.cos(ang) * r, 0.4 + Math.random() * 0.8, Math.sin(ang) * r))
          .clone();
        this.effects.spawnArcNoisePath(base, to, fx.arc, 0.08, 2);
      }
    } catch (_) { }
  }

  // Prefer enemies in front of player within a small aim cone
  _pickTargetInAim(range = 36, halfAngleDeg = 12) {
    try {
      const fwd = __vA.set(0, 0, 1).applyQuaternion(this.player.mesh.quaternion).setY(0).normalize();
      const cosT = Math.cos((Math.max(1, halfAngleDeg) * Math.PI) / 180);
      const pos = this.player.pos();
      let best = null;
      let bestScore = -Infinity;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = distance2D(pos, e.pos());
        if (d > range) continue;
        const v = __vB.copy(e.pos()).sub(pos).setY(0);
        const len = v.length() || 1;
        const dir = __vC.copy(v).multiplyScalar(1 / len);
        const dot = dir.dot(fwd);
        if (dot <= cosT || dot <= 0) continue;
        // score: prefer higher alignment and closer distance along forward
        const proj = len * dot;
        const score = dot * 2 - proj * 0.01;
        if (score > bestScore) {
          bestScore = score;
          best = e;
        }
      }
      return best;
    } catch (_) {
      return null;
    }
  }

  // ----- Cooldowns -----
  startCooldown(key, seconds) {
    this.cooldowns[key] = now() + seconds;
  }
  isOnCooldown(key) {
    return now() < this.cooldowns[key];
  }

  // ----- UI (cooldowns) -----
  updateCooldownUI() {
    const t = now();
    for (const key of ["Q", "W", "E", "R", "Basic"]) {
      const end = this.cooldowns[key];
      const el = this.cdUI?.[key];
      if (!el) continue;

      let remain = 0;
      if (!end || end <= 0) {
        el.style.background = "none";
        el.textContent = "";
      } else {
        remain = Math.max(0, end - t);
        // Hide "0.0" at the end of cooldown: clear text/background when very close to ready
        if (remain <= 0.05) {
          el.style.background = "none";
          el.textContent = "";
        } else {
          const total = key === "Basic" ? WORLD.basicAttackCooldown : getSkill(key)?.cd || 0;
          const pct = clamp01(remain / total);
          const deg = Math.floor(pct * 360);
          const wedge = pct > 0.5 ? "rgba(70,100,150,0.55)" : pct > 0.2 ? "rgba(90,150,220,0.55)" : "rgba(150,220,255,0.65)";
          el.style.background = `conic-gradient(${wedge} ${deg}deg, rgba(0,0,0,0) 0deg)`;
          el.textContent = remain < 3 ? remain.toFixed(1) : `${Math.ceil(remain)}`;
        }
      }

      // Mirror to any duplicate cooldown displays (e.g. bottom-middle .cooldown[data-cd="cdQ"])
      try {
        const masterId = el.id;
        if (masterId) {
          const dups = document.querySelectorAll(`#bottomMiddle .cooldown[data-cd="${masterId}"]`);
          dups.forEach((d) => {
            d.style.background = el.style.background;
            d.textContent = el.textContent;
          });
        }
      } catch (_) { }

      // flash on ready transition
      const prev = this.cdState[key] || 0;
      if (prev > 0 && remain === 0) {
        el.classList.add("flash");
        el.dataset.flashUntil = String(t + 0.25);
        try {
          const masterId = el.id;
          if (masterId) {
            const dups = document.querySelectorAll(`#bottomMiddle .cooldown[data-cd="${masterId}"]`);
            dups.forEach((d) => {
              d.classList.add("flash");
              d.dataset.flashUntil = el.dataset.flashUntil;
            });
          }
        } catch (_) { }
      }
      if (el.dataset.flashUntil && t > parseFloat(el.dataset.flashUntil)) {
        el.classList.remove("flash");
        delete el.dataset.flashUntil;
        try {
          const masterId = el.id;
          if (masterId) {
            const dups = document.querySelectorAll(`#bottomMiddle .cooldown[data-cd="${masterId}"]`);
            dups.forEach((d) => {
              d.classList.remove("flash");
              delete d.dataset.flashUntil;
            });
          }
        } catch (_) { }
      }
      this.cdState[key] = remain;
    }
  }

  // ----- Combat -----
  /**
   * Attempt a basic fire attack if in range and off cooldown.
   * Returns true on success, false otherwise.
   * @param {import("./entities.js").Entity} attacker
   * @param {import("./entities.js").Entity} target
   * @returns {boolean}
   */
  tryBasicAttack(attacker, target) {
    const time = now();
    if (time < (attacker.nextBasicReady || 0)) return false;

    // Allow casting without a target
    const hasValidTarget = target && target.alive;

    // Prevent player from attacking targets outside while inside any village (origin or dynamic).
    // Falls back to origin-only rule if villages API is not provided.
    if (hasValidTarget) {
      try {
        if (attacker === this.player) {
          // More permissive safe-zone rule:
          // - Allow attacking inside same village
          // - Allow attacking just outside boundary (small tolerance)
          // - Prevent cross-village aggression only when both are inside different villages
          if (this.villages && typeof this.villages.isInsideAnyVillage === "function") {
            const pin = this.villages.isInsideAnyVillage(attacker.pos());
            const tin = this.villages.isInsideAnyVillage(target.pos());
            if (pin && pin.inside && tin && tin.inside && pin.key !== tin.key) {
              return false; // inside different villages
            }
          } else {
            // Fallback: origin-only safe ring with tolerance to avoid misses near boundary
            const pd = distance2D(attacker.pos(), VILLAGE_POS);
            const td = distance2D(target.pos(), VILLAGE_POS);
            const tol = 1.5;
            if (pd <= REST_RADIUS - tol && td > REST_RADIUS + tol) return false;
          }
        }
      } catch (e) {
        // ignore errors in defensive check
      }

      const dist = distance2D(attacker.pos(), target.pos());
      if (dist > WORLD.attackRange * (WORLD.attackRangeMult || 1)) return false;
    }

    const buffMul = attacker.atkSpeedUntil && now() < attacker.atkSpeedUntil ? attacker.atkSpeedMul || 1 : 1;
    const permaMul = attacker.atkSpeedPerma || 1;
    const effMul = Math.max(0.5, buffMul * permaMul);
    const basicCd = WORLD.basicAttackCooldown / effMul;
    attacker.nextBasicReady = time + basicCd;
    if (attacker === this.player) {
      // Mirror basic attack cooldown into UI like other skills
      this.startCooldown("Basic", basicCd);
    }
    const from = attacker === this.player && this.player.mesh.userData.handAnchor ? handWorldPos(this.player) : __vA.copy(attacker.pos()).add(__vB.set(0, 1.6, 0)).clone();

    // Calculate target position: use actual target if available, otherwise fire in facing direction
    let to;
    if (hasValidTarget) {
      to = __vC.copy(target.pos()).add(__vB.set(0, 1.2, 0)).clone();
    } else {
      // Fire in the direction the player is facing
      const range = WORLD.attackRange * (WORLD.attackRangeMult || 1);
      const yaw = attacker.lastFacingYaw || attacker.mesh.rotation.y || 0;
      to = __vC
        .copy(attacker.pos())
        .add(__vB.set(Math.sin(yaw) * range, 1.2, Math.cos(yaw) * range))
        .clone();
    }

    // FIRE PROJECTILE: Spawn fireball that travels to target
    const baseDmg = this.getBasicDamage(attacker);
    const up = getBasicUplift ? getBasicUplift() : { aoeRadius: 0, chainJumps: 0, dmgMul: 1 };
    const dmg = Math.max(1, Math.floor(baseDmg * (up.dmgMul || 1)));

    this.effects.spawnFireball(from, to, {
      color: COLOR.fire,
      size: 0.35,
      speed: 25,
      onComplete: (hitPos) => {
        // Impact explosion at target
        this.effects.spawnStrike(hitPos, 1.2, COLOR.fire);
        if (hasValidTarget) {
          this.effects.spawnHitDecal(target.pos(), COLOR.ember);
        }
      },
    });

    audio.sfx("basic");
    // FP hand VFX for basic attack - fire casting effects
    try {
      this.effects.spawnHandFlash(this.player);
      this.effects.spawnHandCrackle(this.player, false, 1.0);
      this.effects.spawnHandCrackle(this.player, true, 1.0);
      this.effects.spawnHandFlash(this.player, true);
      this.effects.spawnHandCrackle(this.player, false, 1.2);
      this.effects.spawnHandCrackle(this.player, true, 1.2);
    } catch (e) { }
    if (attacker === this.player) this.player.braceUntil = now() + 0.18;

    // Only deal damage if there's a valid target
    if (hasValidTarget) {
      target.takeDamage(dmg);
      try {
        this.effects.spawnDamagePopup(target.pos(), dmg);
      } catch (e) { }

      // Uplift: AOE explosion around the hit target
      try {
        if (up.aoeRadius && up.aoeRadius > 0) {
          this.effects.spawnStrike(target.pos(), up.aoeRadius, COLOR.ember);
          const r = up.aoeRadius + 2.5;
          this.enemies.forEach((en) => {
            if (!en.alive || en === target) return;
            if (distance2D(en.pos(), target.pos()) <= r) en.takeDamage(Math.max(1, Math.floor(dmg * 0.8)));
          });
        }
      } catch (_) { }

      // Uplift: Chain to nearby enemies
      try {
        let jumps = Math.max(0, up.chainJumps || 0);
        let current = target;
        const hitSet = new Set([current]);
        while (jumps-- > 0) {
          const candidates = this.enemies.filter((e) => e.alive && !hitSet.has(e) && distance2D(current.pos(), e.pos()) <= 22).sort((a, b) => distance2D(current.pos(), a.pos()) - distance2D(current.pos(), b.pos()));
          const nxt = candidates[0];
          if (!nxt) break;
          hitSet.add(nxt);
          const from = __vA.copy(current.pos()).add(__vB.set(0, 1.2, 0)).clone();
          const to = __vC.copy(nxt.pos()).add(__vB.set(0, 1.2, 0)).clone();
          try {
            this.effects.spawnFireStreamAuto(from, to, COLOR.ember, 0.08);
          } catch (_) { }
          nxt.takeDamage(Math.max(1, Math.floor(dmg * 0.85)));
          current = nxt;
        }
      } catch (_) { }
    }

    return true;
  }

  // ----- Skills -----
  /**
   * Internal helper: Execute skill effects without resource checks
   * Shared by castSkill and previewSkill for consistency
   */
  async _executeSkillLogic(def, point = null) {
    // Auto-select point if none provided for ground-targeted skills
    if (!point && (def.type === "aoe" || def.type === "blink" || def.type === "dash")) {
      const effRange = Math.max(WORLD.attackRange * (WORLD.attackRangeMult || 1), (def.radius || 0) + 10);
      let candidates = this.enemies.filter((e) => e.alive && distance2D(this.player.pos(), e.pos()) <= effRange + (def.radius || 0));
      if (candidates.length === 0 && def.type === "aoe") {
        try {
          this.effects.showNoTargetHint?.(this.player, effRange);
        } catch (_) { }
        return;
      }
      if (candidates.length > 0) {
        candidates.sort((a, b) => distance2D(this.player.pos(), a.pos()) - distance2D(this.player.pos(), b.pos()));
        point = __vA.copy(candidates[0].pos()).clone();
      } else {
        point = this.player.pos().clone();
      }
    }

    // Cast flash VFX
    this._vfxCastFlash(def);
    try {
      if (FX && FX.sfxOnCast) audio.sfx("cast");
    } catch (_) { }

    // Collect targets in range. Different skill types use different distance fields:
    // - chain skills use `range` / `jumpRange`
    // - aoe and others use `radius`
    const centerPos = point || this.player.pos();
    let targetRange = 0;
    if (def.type === "chain") {
      // Prefer explicit `range`, fall back to `jumpRange` or global attack range
      targetRange = def.range != null ? def.range : def.jumpRange != null ? def.jumpRange : WORLD.attackRange || 36;
    } else if (def.type === "beam") {
      // Beam skills target enemies at distance (use def.range)
      targetRange = def.range != null ? def.range : WORLD.attackRange || 36;
    } else {
      // For AOE and other ground-targeted skills use radius with small tolerance
      targetRange = (def.radius || 0) + 2.5;
    }

    const targets = this.enemies.filter((en) => {
      return en.alive && distance2D(en.pos(), centerPos) <= targetRange;
    });

    // Determine a preferred target (if any) so chain-style effects can prefer aimed targets
    let preferredTarget = null;
    try {
      // Prefer explicit player target if it's alive and within the computed targetRange
      if (this.player && this.player.target && this.player.target.alive) {
        try {
          if (distance2D(this.player.target.pos(), centerPos) <= targetRange) preferredTarget = this.player.target;
        } catch (_) { }
      }
      // Fallback: try to pick an enemy in the player's aim cone
      if (!preferredTarget) {
        const aimRange = def.range != null ? def.range : def.jumpRange != null ? def.jumpRange : WORLD.attackRange || 36;
        const aimed = this._pickTargetInAim(aimRange, 14);
        if (aimed && aimed.alive) {
          try {
            if (distance2D(aimed.pos(), centerPos) <= targetRange) preferredTarget = aimed;
          } catch (_) { }
        }
      }
    } catch (_) { }

    // As a final fallback for beam skills, pick the nearest enemy within targetRange
    try {
      if (!preferredTarget && def.type === "beam") {
        let nearest = null;
        let bestD = Infinity;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          try {
            const d = distance2D(centerPos, e.pos());
            if (d <= targetRange && d < bestD) {
              bestD = d;
              nearest = e;
            }
          } catch (_) { }
        }
        if (nearest) preferredTarget = nearest;
      }
    } catch (_) { }

    // Execute skill effect - let the effect file handle everything
    const fx = this._fx(def);
    try {
      // Compute default beam endpoints for skills that use explicit from/to
      const fromPos = this.player && this.player.mesh && this.player.mesh.userData && this.player.mesh.userData.handAnchor ? handWorldPos(this.player) : __vA.copy(this.player.pos()).add(__vB.set(0, 1.6, 0)).clone();

      // Prefer explicit point (ground-targeted), then preferredTarget entity position, then forward cast
      let toPos = null;
      if (point && typeof point.x === "number") {
        toPos = point.clone().add(new THREE.Vector3(0, 1.2, 0));
      } else if (preferredTarget && typeof preferredTarget.pos === "function") {
        toPos = preferredTarget.pos().clone().add(new THREE.Vector3(0, 1.2, 0));
      } else if (targets && targets.length > 0) {
        try {
          toPos = targets[0].pos().clone().add(new THREE.Vector3(0, 1.2, 0));
        } catch (_) {
          toPos = null;
        }
      }
      if (!toPos) {
        // Fire forward based on player's facing yaw
        const yaw = (this.player && this.player.lastFacingYaw) || (this.player && this.player.mesh && this.player.mesh.rotation && this.player.mesh.rotation.y) || 0;
        const range = def.range || WORLD.attackRange * (WORLD.attackRangeMult || 1) || 36;
        toPos = __vC
          .copy(this.player.pos())
          .add(__vB.set(Math.sin(yaw) * range, 1.2, Math.cos(yaw) * range))
          .clone();
      }

      // Ensure preferredTarget is included in targets passed to effects (so beam effects can damage it)
      // For beam skills, prefer targets along the beam path (fromPos->toPos)
      let sendTargets = Array.isArray(targets) ? targets.slice() : [];
      if (def.type === "beam") {
        try {
          const from2 = fromPos.clone();
          const to2 = toPos.clone();
          const segDir = to2.clone().sub(from2);
          const segLenSq = Math.max(0.0001, segDir.lengthSq());
          const tubeRadius = Math.max(1.6, (def.radius || 2.0)); // beam hit tolerance
          const beamTargets = [];
          for (const e of this.enemies) {
            if (!e || !e.alive) continue;
            try {
              const p = e.pos();
              // Project point onto segment in XZ plane
              const vx = p.x - from2.x;
              const vz = p.z - from2.z;
              const sx = segDir.x;
              const sz = segDir.z;
              const proj = (vx * sx + vz * sz) / segLenSq;
              const t = Math.max(0, Math.min(1, proj));
              const cx = from2.x + sx * t;
              const cz = from2.z + sz * t;
              const dx = p.x - cx;
              const dz = p.z - cz;
              const dist2 = dx * dx + dz * dz;
              if (dist2 <= tubeRadius * tubeRadius) beamTargets.push(e);
            } catch (_) { }
          }
          if (beamTargets.length > 0) sendTargets = beamTargets;
        } catch (_) { }
      }
      if (preferredTarget && !sendTargets.includes(preferredTarget)) sendTargets.unshift(preferredTarget);

      // Import default effect handling if no custom effect exists
      const skillEffectParams = {
        skillId: def.id,
        player: this.player,
        center: centerPos,
        radius: def.radius || 8,
        range: def.range,
        jumps: def.jumps,
        jumpRange: def.jumpRange,
        targets: sendTargets,
        preferredTarget: preferredTarget,
        dmg: this.scaleSkillDamage(def.dmg || 0),
        slowFactor: def.slowFactor,
        slowDuration: def.slowDuration,
        shake: fx.shake,
        point: point,
        from: fromPos,
        to: toPos,
      };

      // Try using effect loader first
      try {
        await import("./effects_loader.js").then(loader => {
          loader.executeSkillEffect(def.id, this.effects, skillEffectParams);
        });
      } catch (err) {
        console.warn("[Skills] Custom effect failed, using fallback:", err);
        // Fallback to basic effects
        if (fromPos && toPos) {
          this.effects.spawnBeam(fromPos, toPos, fx.beam, 0.15);
          this.effects.spawnImpact(toPos, 1.5, fx.impact);
        } else if (centerPos) {
          this.effects.spawnImpact(centerPos, def.radius || 2, fx.impact);
          this.effects.spawnRing(centerPos, def.radius || 3, fx.ring, 0.4);
        }
      }
    } catch (e) {
      console.warn("[Skills] executeSkillEffect failed for", def.id, e);
    }

    // Apply damage and effects (fallback if effect file doesn't handle it)
    targets.forEach((en) => {
      const dmg = this.scaleSkillDamage(def.dmg || 0);
      en.takeDamage(dmg);
      if (def.slowFactor) {
        en.slowUntil = now() + (def.slowDuration || 1.5);
        en.slowFactor = def.slowFactor;
      }
    });

    this._requestShake(fx.shake);
  }

  /**
   * Generic skill dispatcher. Use castSkill('Q'|'W'|'E'|'R', point?)
   * All skills now use their own effect files - no type checking needed
   */
  castSkill(key, point = null) {
    if (!key) return;
    if (this.isOnCooldown(key)) return;
    const SK = getSkill(key);
    if (!SK) {
      console.warn("castSkill: unknown SKILLS key", key);
      return;
    }

    // Check mana
    if (!this.player.canSpend(SK.mana)) return;

    // Spend mana and start cooldown
    this.player.spend(SK.mana);
    this.startCooldown(key, SK.cd);

    // Execute using shared logic
    this._executeSkillLogic(SK, point);
  }

  previewSkill(def) {
    if (!def) return;
    try {
      // Execute using shared logic (no mana/cooldown checks)
      this._executeSkillLogic(def);
    } catch (e) {
      console.warn("[Skills] previewSkill failed:", e);
    }
  }

  // ----- Per-frame update -----
  update(t, dt, cameraShake) {
    // Update cooldown UI every frame
    this.updateCooldownUI();

    // Apply pending camera shake
    if (cameraShake && (this._pendingShake || 0) > 0) {
      cameraShake.mag = Math.max(cameraShake.mag || 0, this._pendingShake);
      cameraShake.until = now() + 0.22;
      this._pendingShake = 0;
    }
  }
}

// Local small helper
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
