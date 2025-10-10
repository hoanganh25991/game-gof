import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";
import { now } from "../utils.js";
import { FX } from "../constants.js";

/**
 * Meteor Storm Effect
 * 
 * UNIQUE VISUAL: Actual meteors falling from sky with realistic physics,
 * fire trails, crater impacts with shockwaves, and lingering flames
 */
export default function meteorStormEffect(baseEffects, params) {
  const { center, radius = 12, strike, strikePos, targets = [] } = params || {};
  const fx = SKILL_FX.meteor_storm || {};
  const colors = {
    core: fx.colors?.core || 0xffff66,
    ember: fx.colors?.ember || 0xffa050,
    impact: fx.colors?.impact || 0xff4500,
    ring: fx.colors?.ring || 0xff6347,
    smoke: fx.colors?.smoke || 0x2a2a2a
  };

  // Simple damage resolution: prefer explicit param, then params.dmg, then a sensible default
  const damage = params?.dmg ?? params?.damage ?? 20;

  // Quality-aware particle counts
  const quality = baseEffects?.quality || "high";
  const meteorTrailCount = quality === "low" ? 4 : quality === "medium" ? 8 : 14;
  const debrisCount = quality === "low" ? 8 : quality === "medium" ? 24 : 50;

  // Helper: safely apply damage to entities and show popups
  function applyDamageToTargets(hitTargets, dmg, impactPos) {
    if (!Array.isArray(hitTargets) || !hitTargets.length) return;
    for (const t of hitTargets) {
      try {
        if (t && typeof t.takeDamage === "function") {
          t.takeDamage(dmg);
          // Spawn damage popup at entity position if possible
          if (typeof t.pos === "function") {
            const p = t.pos();
            baseEffects.spawnDamagePopup(p, dmg, "#ffb3b3");
          }
        } else if (t && t.position) {
          // Some targets may be raw positions
          baseEffects.spawnDamagePopup(t.position, dmg, "#ffb3b3");
        }
      } catch (err) {
        try { baseEffects.spawnDamagePopup(impactPos, dmg, "#ffb3b3"); } catch (_) {}
      }
    }
  }

  // Create a dramatic impact crater with shockwaves, debris and lingering fire
  function createImpactCrater(position, craterSize = 2.0) {
    try {
      // Central scorched ring
      const craterRing = new THREE.Mesh(
        new THREE.RingGeometry(craterSize * 0.6, craterSize * 1.8, 48),
        new THREE.MeshBasicMaterial({ color: colors.impact, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      craterRing.rotation.x = -Math.PI / 2;
      craterRing.position.set(position.x, 0.02, position.z);
      baseEffects.indicators.add(craterRing);
      baseEffects.queue.push({ obj: craterRing, until: now() + 2.8 * FX.timeScale, fade: true, mat: craterRing.material });

      // Immediate flash
      baseEffects.spawnSphere(position, craterSize * 1.3, colors.core, 0.18, 1.0);

      // Expanding shockwaves
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const shock = new THREE.Mesh(
            new THREE.RingGeometry(0.2, 0.6, 48),
            new THREE.MeshBasicMaterial({ color: i === 0 ? colors.core : colors.ember, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
          );
          shock.rotation.x = -Math.PI / 2;
          shock.position.set(position.x, 0.1, position.z);
          baseEffects.indicators.add(shock);
          const start = now();
          baseEffects.queue.push({
            obj: shock,
            until: start + (0.6 + i * 0.15) * FX.timeScale,
            fade: true,
            mat: shock.material,
            shockwave: true,
            shockwaveStartTime: start,
            shockwaveDuration: 0.6 + i * 0.15,
            shockwaveMaxRadius: craterSize * (i + 1) * 2,
            shockwaveThickness: 0.6
          });
        }, i * 70);
      }

      // Debris
      for (let i = 0; i < debrisCount; i++) {
        const isRock = Math.random() > 0.5;
        const geom = isRock ? new THREE.DodecahedronGeometry(0.06 + Math.random() * 0.15, 0) : new THREE.SphereGeometry(0.06 + Math.random() * 0.12, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: isRock ? 0x3a2a1a : colors.ember, transparent: true, opacity: 0.9 });
        const debris = new THREE.Mesh(geom, mat);
        debris.position.set(position.x, position.y + 0.2, position.z);
        baseEffects.transient.add(debris);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        baseEffects.queue.push({
          obj: debris,
          until: now() + (0.8 + Math.random() * 1.0) * FX.timeScale,
          fade: true,
          mat,
          particle: true,
          velocity: new THREE.Vector3(Math.cos(angle) * speed, 2 + Math.random() * 3, Math.sin(angle) * speed),
          gravity: -10,
          spinRate: Math.random() * 6 - 3
        });
      }

      // Small lingering fire ring
      const fireRing = new THREE.Mesh(
        new THREE.RingGeometry(craterSize * 0.5, craterSize * 1.2, 48),
        new THREE.MeshBasicMaterial({ color: 0x8b0000, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      fireRing.rotation.x = -Math.PI / 2;
      fireRing.position.set(position.x, 0.02, position.z);
      baseEffects.indicators.add(fireRing);
      baseEffects.queue.push({ obj: fireRing, until: now() + 2.2 * FX.timeScale, fade: true, mat: fireRing.material, pulseAmp: 0.12, pulseRate: 3.0 });
    } catch (err) {
      // fail silently - effects should never blow up the runtime
      console.warn('[meteor_storm] createImpactCrater failed', err);
    }
  }

  /**
   * Per-strike meteor creation and animation
   */
  function spawnMeteorStrike(impactPos) {
    const skyHeight = Math.max(12, (radius || 12) * 0.6 + 6);
    const jitterX = (Math.random() - 0.5) * 4;
    const jitterZ = (Math.random() - 0.5) * 4;
    const startPos = new THREE.Vector3(impactPos.x + jitterX, skyHeight, impactPos.z + jitterZ);

    // Create meteor visual group
    const meteorGroup = new THREE.Group();

    // Rocky core
    const meteorSize = 0.9 + Math.random() * 1.6;
    const coreGeo = new THREE.DodecahedronGeometry(meteorSize, 0);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x2a1a0a, transparent: true, opacity: 1.0 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    meteorGroup.add(coreMesh);

    // Fiery shell
    const shellGeo = new THREE.IcosahedronGeometry(meteorSize * 1.25, 1);
    const shellMat = new THREE.MeshBasicMaterial({ color: colors.ember, transparent: true, opacity: 0.9 });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    shellMesh.scale.set(1.05, 1.05, 1.05);
    meteorGroup.add(shellMesh);

    // Glowing core
    const glowGeo = new THREE.SphereGeometry(meteorSize * 0.55, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({ color: colors.core, transparent: true, opacity: 0.95 });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    meteorGroup.add(glowMesh);

    meteorGroup.position.copy(startPos);
    baseEffects.transient.add(meteorGroup);

    // Trail particles (simple spheres added to transient + queued)
    const trailParticles = [];
    for (let i = 0; i < meteorTrailCount; i++) {
      const tp = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + Math.random() * 0.14, 6, 6),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.6 ? colors.core : colors.ember, transparent: true, opacity: 0.9 })
      );
      tp.position.copy(meteorGroup.position);
      baseEffects.transient.add(tp);
      trailParticles.push(tp);
      baseEffects.queue.push({ obj: tp, until: now() + 0.6 * FX.timeScale, fade: true, mat: tp.material, scaleRate: -2.0 });
    }

    // Animate fall using requestAnimationFrame (ms timebase)
    const startMs = performance.now();
    const fallDurationMs = 400 + Math.random() * 600; // 400ms - 1000ms

    function animate() {
      const t = performance.now() - startMs;
      const progress = Math.min(1, t / fallDurationMs);

      // easing for a snappy fall
      const ease = Math.pow(progress, 0.6);
      meteorGroup.position.y = startPos.y - (startPos.y - impactPos.y) * ease;
      meteorGroup.position.x = startPos.x + (impactPos.x - startPos.x) * progress + Math.sin(progress * Math.PI * 4) * 0.15;
      meteorGroup.position.z = startPos.z + (impactPos.z - startPos.z) * progress + Math.cos(progress * Math.PI * 3) * 0.12;

      meteorGroup.rotation.x += 0.15 + Math.random() * 0.05;
      meteorGroup.rotation.y += 0.12 + Math.random() * 0.06;

      // update trail positions
      trailParticles.forEach((p, i) => {
        p.position.lerp(meteorGroup.position, 0.2 + i * 0.01);
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Impact
        try {
          baseEffects.spawnImpact(impactPos, params?.strikeRadius || 2.6, colors.impact, 1.8);
          baseEffects.spawnRing(impactPos, Math.max(2.0, (params?.strikeRadius || 2.6) * 1.2), colors.ring, 0.5, 1.1, 0.65);
          createImpactCrater(impactPos, params?.strikeRadius || 2.6);
          applyDamageToTargets(targets, damage, impactPos);
        } catch (err) {
          console.warn('[meteor_storm] impact effects failed', err);
        }

        // Cleanup meteor and trails
        try {
          baseEffects.transient.remove(meteorGroup);
          coreGeo.dispose();
          coreMat.dispose();
          shellGeo.dispose();
          shellMat.dispose();
          glowGeo.dispose();
          glowMat.dispose();
        } catch (_) {}
      }
    }

    animate();
  }

  // Activation visuals (initial cast): warning ring, pulsing inner ring, storm cloud and orbiting embers
  if (!strike && center) {
    try {
      // Warning ring
      const warning = new THREE.Mesh(
        new THREE.RingGeometry(radius - 1.6, radius + 1.6, 64),
        new THREE.MeshBasicMaterial({ color: colors.ember, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
      );
      warning.rotation.x = -Math.PI / 2;
      warning.position.set(center.x, 0.05, center.z);
      baseEffects.indicators.add(warning);
      baseEffects.queue.push({ obj: warning, until: now() + 1.6 * FX.timeScale, fade: true, mat: warning.material, pulseAmp: 0.18, pulseRate: 3.6 });

      // Inner pulsing ring after a short delay
      setTimeout(() => {
        baseEffects.spawnRing(center, Math.max(2, radius * 0.5), colors.ember, 0.8, 1.0, 0.45);
      }, 140);

      // Spawn a storm cloud (disc) high above center
      baseEffects.spawnStormCloud(center, radius * 0.9, colors.smoke, Math.max(3, params?.duration || 2.6), Math.max(3.2, radius * 0.08));

      // Orbiting ember orbs for atmosphere
      const orbCount = quality === "low" ? 3 : (quality === "medium" ? 6 : 10);
      for (let i = 0; i < orbCount; i++) {
        const angle = (i / orbCount) * Math.PI * 2;
        const pos = new THREE.Vector3(
          center.x + Math.cos(angle) * (radius * 0.6 + (Math.random() - 0.5) * 2),
          center.y + 1.6 + Math.random() * 1.0,
          center.z + Math.sin(angle) * (radius * 0.6 + (Math.random() - 0.5) * 2)
        );
        baseEffects.spawnSphere(pos, 0.18, colors.core, 0.9, 0.95);
      }
    } catch (err) {
      console.warn('[meteor_storm] activation visuals failed', err);
    }
    return; // activation done
  }

  // Strike mode: when the engine schedules individual strikes
  if (strike && strikePos) {
    try {
      // Spawn a single meteor strike at strikePos
      spawnMeteorStrike(strikePos);
    } catch (err) {
      console.warn('[meteor_storm] spawn strike failed', err);
    }
  }
}

/**
 * Create realistic impact crater with explosion effects
 */
function createImpactCrater(position, craterSize, colors, baseEffects) {
  // Ground crater ring (scorched earth)
  const craterRing = new THREE.Mesh(
    new THREE.RingGeometry(craterSize * 0.8, craterSize * 2.5, 48),
    new THREE.MeshBasicMaterial({
      color: 0x2a1a0a, // Scorched black
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
  );
  craterRing.rotation.x = -Math.PI / 2;
  craterRing.position.set(position.x, 0.01, position.z);
  baseEffects.indicators.add(craterRing);
  
  baseEffects.queue.push({
    obj: craterRing,
    until: now() + 3.0 * FX.timeScale,
    fade: true,
    mat: craterRing.material
  });
  
  // Explosion flash (bright yellow core)
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(craterSize * 1.5, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 1.0
    })
  );
  flash.position.set(position.x, 0.5, position.z);
  baseEffects.transient.add(flash);
  
  baseEffects.queue.push({
    obj: flash,
    until: now() + 0.2 * FX.timeScale,
    fade: true,
    mat: flash.material,
    scaleRate: 8.0
  });
  
  // Multiple expanding shockwave rings
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const shockwave = new THREE.Mesh(
        new THREE.RingGeometry(0.2, 0.6, 48),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? 0xffff00 : (i === 1 ? 0xff6347 : 0xff4500),
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        })
      );
      shockwave.rotation.x = -Math.PI / 2;
      shockwave.position.set(position.x, 0.1, position.z);
      baseEffects.indicators.add(shockwave);
      
      const maxScale = craterSize * (i + 1) * 2;
      const duration = 0.6 + i * 0.1;
      const startTime = now();
      
      baseEffects.queue.push({
        obj: shockwave,
        until: startTime + duration * FX.timeScale,
        fade: true,
        mat: shockwave.material,
        shockwave: true,
        shockwaveMaxRadius: maxScale,
        shockwaveThickness: 0.6,
        shockwaveStartTime: startTime,
        shockwaveDuration: duration
      });
    }, i * 80);
  }
  
  // Debris explosion (rocks and fire)
  for (let i = 0; i < 50; i++) {
    const isRock = Math.random() > 0.5;
    const debris = new THREE.Mesh(
      isRock 
        ? new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.2, 0)
        : new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 8, 8),
      new THREE.MeshBasicMaterial({
        color: isRock ? 0x3a2a1a : (Math.random() > 0.5 ? 0xff6347 : 0xffa500),
        transparent: true,
        opacity: 0.9
      })
    );
    
    debris.position.set(position.x, position.y + 0.2, position.z);
    baseEffects.transient.add(debris);
    
    // Random velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    const upSpeed = 2 + Math.random() * 4;
    
    baseEffects.queue.push({
      obj: debris,
      until: now() + (0.8 + Math.random() * 0.8) * FX.timeScale,
      fade: true,
      mat: debris.material,
      particle: true,
      velocity: new THREE.Vector3(
        Math.cos(angle) * speed,
        upSpeed,
        Math.sin(angle) * speed
      ),
      gravity: -12,
      spinRate: Math.random() * 10 - 5
    });
  }
  
  // Fire pillars shooting up
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dist = craterSize * (0.5 + Math.random() * 0.8);
    const pillarPos = new THREE.Vector3(
      position.x + Math.cos(angle) * dist,
      position.y,
      position.z + Math.sin(angle) * dist
    );
    
    setTimeout(() => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 4 + Math.random() * 2, 12),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xff4500 : 0xff6347,
          transparent: true,
          opacity: 0.8
        })
      );
      pillar.position.set(pillarPos.x, 2, pillarPos.z);
      baseEffects.transient.add(pillar);
      
      baseEffects.queue.push({
        obj: pillar,
        until: now() + 0.5 * FX.timeScale,
        fade: true,
        mat: pillar.material,
        scaleRate: -1.5
      });
    }, i * 40);
  }
  
  // Lingering fire ring
  const fireRing = new THREE.Mesh(
    new THREE.RingGeometry(craterSize * 0.5, craterSize * 1.5, 48),
    new THREE.MeshBasicMaterial({
      color: 0x8b0000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
  );
  fireRing.rotation.x = -Math.PI / 2;
  fireRing.position.set(position.x, 0.02, position.z);
  baseEffects.indicators.add(fireRing);
  
  baseEffects.queue.push({
    obj: fireRing,
    until: now() + 2.0 * FX.timeScale,
    fade: true,
    mat: fireRing.material,
    pulseAmp: 0.1,
    pulseRate: 3.0,
    baseScale: 1
  });
}