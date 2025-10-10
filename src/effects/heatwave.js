import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Heatwave Effect
 * 
 * UNIQUE VISUAL: Expanding wave of heat with ripples, distortion effect,
 * and scorched ground trail
 */
export default function heatwaveEffect(baseEffects, params) {
  const { from, to } = params;
  const fx = SKILL_FX.heatwave || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  const dir = new THREE.Vector3().subVectors(to, from);
  const distance = dir.length();
  const waveWidth = size.width || 2.0;
  const waveHeight = size.wave || 1.5;
  
  // Create wave front (expanding cone)
  baseEffects.spawnCone(
    from,
    dir.clone().normalize(),
    45,
    distance * 0.3,
    colors.primary || "#ff8c00",
    20,
    0.5
  );
  
  // Multiple ripple waves
  const rippleCount = custom.ripples || 5;
  for (let i = 0; i < rippleCount; i++) {
    setTimeout(() => {
      const t = i / rippleCount;
      const ripplePos = new THREE.Vector3().lerpVectors(from, to, t);
      
      // Expanding ripple ring
      baseEffects.spawnShockwave(
        ripplePos,
        waveWidth * 2,
        i % 2 === 0 ? colors.primary || "#ff8c00" : colors.secondary || "#ffa500",
        0.6,
        0.4
      );
      
      // Vertical heat pillar
      baseEffects.spawnPillar(
        ripplePos,
        waveHeight * 2,
        0.6,
        colors.accent || "#ff6347",
        0.5
      );
      
      // Heat particles
      baseEffects.spawnParticleBurst(
        new THREE.Vector3(ripplePos.x, ripplePos.y + 1, ripplePos.z),
        particles.count || 40 / rippleCount,
        colors.distortion || "#ffaa00",
        particles.speed || 2.5,
        0.15,
        particles.lifetime || 1.5
      );
    }, i * (distance / (custom.waveSpeed || 15)) * 200);
  }
  
  // Ground scorch trail
  if (custom.groundScorch) {
    const scorchSteps = 15;
    for (let i = 0; i < scorchSteps; i++) {
      const t = i / scorchSteps;
      const scorchPos = new THREE.Vector3().lerpVectors(from, to, t);
      
      setTimeout(() => {
        baseEffects.spawnRing(
          scorchPos,
          waveWidth,
          colors.secondary || "#ffa500",
          1.5,
          0.8,
          0.4
        );
      }, i * 50);
    }
  }
  
  // Heat distortion particles (floating upward)
  const distortionCount = Math.floor((custom.heatDistortion || 2.0) * 20);
  for (let i = 0; i < distortionCount; i++) {
    setTimeout(() => {
      const t = Math.random();
      const pos = new THREE.Vector3().lerpVectors(from, to, t);
      
      // Random offset within wave width
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * waveWidth;
      pos.x += Math.cos(angle) * radius;
      pos.z += Math.sin(angle) * radius;
      
      // Upward floating particle
      const endPos = pos.clone();
      endPos.y += 2 + Math.random() * 2;
      
      baseEffects.spawnBeam(
        pos,
        endPos,
        colors.distortion || "#ffaa00",
        1.0
      );
      
      baseEffects.spawnSphere(
        pos,
        0.12,
        colors.distortion || "#ffaa00",
        1.0,
        0.5
      );
    }, i * 30);
  }
  
  // Main wave beam
  baseEffects.spawnBeam(
    from,
    to,
    colors.primary || "#ff8c00",
    0.4
  );
  
  // Secondary wider beam
  const perpDir = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const offset1 = perpDir.clone().multiplyScalar(waveWidth * 0.5);
  const offset2 = perpDir.clone().multiplyScalar(-waveWidth * 0.5);
  
  baseEffects.spawnBeam(
    from.clone().add(offset1),
    to.clone().add(offset1),
    colors.secondary || "#ffa500",
    0.3
  );
  
  baseEffects.spawnBeam(
    from.clone().add(offset2),
    to.clone().add(offset2),
    colors.secondary || "#ffa500",
    0.3
  );
  
  // Impact at target
  baseEffects.spawnImpact(
    to,
    waveHeight,
    colors.accent || "#ff6347",
    1.2
  );
  
  // Final explosion
  baseEffects.spawnShockwave(
    to,
    waveWidth * 2,
    colors.primary || "#ff8c00",
    0.6,
    0.5
  );
}