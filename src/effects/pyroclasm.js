import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Pyroclasm Effect
 * 
 * UNIQUE VISUAL: Catastrophic multi-stage explosion with ground cracks,
 * massive debris, towering fire columns, and devastating shockwaves
 */
export default function pyroclasmEffect(baseEffects, params) {
  const { center, radius } = params;
  const fx = SKILL_FX.pyroclasm || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (!center) return;
  
  const blastRadius = (radius || 20) * (size.explosion || 3.0);
  
  // STAGE 1: Initial impact (immediate)
  baseEffects.spawnSphere(
    center,
    size.explosion || 3.0,
    colors.explosion || "#ffff00",
    0.4,
    1.0
  );
  
  // Ground crater ring
  baseEffects.spawnRing(
    center,
    (custom.craterSize || 3.0) * 2,
    colors.secondary || "#8b0000",
    2.0,
    1.5,
    0.8
  );
  
  // STAGE 2: Shockwaves (staggered)
  const shockwaveCount = custom.shockwaveRings || 5;
  for (let i = 0; i < shockwaveCount; i++) {
    setTimeout(() => {
      baseEffects.spawnShockwave(
        center,
        blastRadius * (i + 1) / shockwaveCount,
        i < 2 ? colors.explosion || "#ffff00" : colors.primary || "#ff4500",
        0.8,
        0.5
      );
    }, i * 100);
  }
  
  // STAGE 3: Towering fire columns
  const columnCount = custom.fireColumns || 12;
  for (let i = 0; i < columnCount; i++) {
    const angle = (i / columnCount) * Math.PI * 2;
    const dist = blastRadius * (0.3 + Math.random() * 0.4);
    const columnPos = new THREE.Vector3(
      center.x + Math.cos(angle) * dist,
      center.y,
      center.z + Math.sin(angle) * dist
    );
    
    setTimeout(() => {
      baseEffects.spawnPillar(
        columnPos,
        8 + Math.random() * 4,
        0.5 + Math.random() * 0.3,
        colors.primary || "#ff4500",
        1.0
      );
      
      // Cone explosion at column base
      baseEffects.spawnCone(
        columnPos,
        new THREE.Vector3(0, 1, 0),
        40,
        5,
        colors.accent || "#ffd700",
        12,
        0.5
      );
    }, i * 50);
  }
  
  // STAGE 4: Ground cracks radiating outward
  const crackCount = custom.groundCracks || 20;
  for (let i = 0; i < crackCount; i++) {
    const angle = (i / crackCount) * Math.PI * 2 + Math.random() * 0.2;
    const crackEnd = new THREE.Vector3(
      center.x + Math.cos(angle) * blastRadius * 0.8,
      center.y,
      center.z + Math.sin(angle) * blastRadius * 0.8
    );
    
    setTimeout(() => {
      baseEffects.spawnBeam(
        center,
        crackEnd,
        colors.secondary || "#8b0000",
        1.5
      );
      
      // Small flames along crack
      const segments = 5;
      for (let j = 1; j < segments; j++) {
        const t = j / segments;
        const pos = new THREE.Vector3().lerpVectors(center, crackEnd, t);
        baseEffects.spawnPillar(pos, 1.5, 0.15, colors.primary || "#ff4500", 0.8);
      }
    }, i * 30);
  }
  
  // STAGE 5: Massive debris explosion
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      particles.count || 100,
      colors.primary || "#ff4500",
      particles.speed || 10.0,
      0.25,
      particles.lifetime || 2.5
    );
  }, 100);
  
  // Secondary debris waves
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      custom.debrisCount || 50,
      colors.secondary || "#8b0000",
      8.0,
      0.2,
      2.0
    );
  }, 250);
  
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      40,
      colors.accent || "#ffd700",
      7.0,
      0.15,
      1.8
    );
  }, 400);
  
  // Central pillar of fire
  setTimeout(() => {
    baseEffects.spawnPillar(
      center,
      12,
      1.0,
      colors.explosion || "#ffff00",
      1.2
    );
  }, 200);
  
  // Massive impact effect
  baseEffects.spawnImpact(
    center,
    size.explosion || 3.0,
    colors.explosion || "#ffff00",
    fx.intensity || 3.0
  );
}