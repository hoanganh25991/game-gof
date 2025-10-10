import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Blazing Aura Effect
 * 
 * UNIQUE VISUAL: Intense golden aura with white-hot core, multiple flame rings,
 * and heat distortion waves
 */
export default function blazingAuraEffect(baseEffects, params) {
  const { center, radius, activation } = params;
  const fx = SKILL_FX.blazing_aura || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (!center) return;
  
  const auraRadius = (radius || 12) * (size.aura || 1.2);
  
  if (activation) {
    // Intense activation burst
    baseEffects.spawnSphere(
      center,
      size.core || 0.5,
      colors.core || "#ffffff",
      0.4,
      1.0
    );
    
    // Multiple expanding rings
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        baseEffects.spawnShockwave(
          center,
          auraRadius * (i + 1) / 3,
          i === 0 ? colors.core || "#ffffff" : colors.primary || "#ffd700",
          0.6,
          0.4
        );
      }, i * 100);
    }
  }
  
  // White-hot core
  baseEffects.spawnSphere(
    new THREE.Vector3(center.x, center.y + 0.8, center.z),
    size.core || 0.5,
    colors.core || "#ffffff",
    0.6,
    0.9
  );
  
  // Concentric flame rings (more than burning aura)
  const ringCount = custom.flameRings || 3;
  for (let i = 0; i < ringCount; i++) {
    const ringRadius = auraRadius * (0.3 + i * 0.35);
    const ringColor = i === 0 
      ? colors.core || "#ffffff"
      : i === 1
        ? colors.primary || "#ffd700"
        : colors.secondary || "#ffa500";
    
    baseEffects.spawnRing(
      center,
      ringRadius,
      ringColor,
      0.6,
      0.7,
      0.6
    );
  }
  
  // Intense heat distortion waves
  const distortionWaves = Math.floor((custom.heatDistortion || 1.5) * 4);
  for (let i = 0; i < distortionWaves; i++) {
    setTimeout(() => {
      baseEffects.spawnShockwave(
        center,
        auraRadius * 0.9,
        colors.accent || "#ffff00",
        0.5,
        0.3
      );
    }, i * 300);
  }
  
  // Floating golden particles
  const particleCount = particles.count || 40;
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * auraRadius;
    const particlePos = new THREE.Vector3(
      center.x + Math.cos(angle) * dist,
      center.y + Math.random() * 0.5,
      center.z + Math.sin(angle) * dist
    );
    
    // Upward floating golden particle
    const endPos = particlePos.clone();
    endPos.y += 3 + Math.random() * 2;
    
    baseEffects.spawnBeam(
      particlePos,
      endPos,
      colors.primary || "#ffd700",
      particles.lifetime || 1.8
    );
    
    baseEffects.spawnSphere(
      particlePos,
      0.15,
      colors.accent || "#ffff00",
      particles.lifetime || 1.8,
      0.9
    );
  }
  
  // Vertical flame pillars (taller and brighter than burning aura)
  const pillarCount = 12;
  for (let i = 0; i < pillarCount; i++) {
    const angle = (i / pillarCount) * Math.PI * 2;
    const pillarPos = new THREE.Vector3(
      center.x + Math.cos(angle) * auraRadius * 0.7,
      center.y,
      center.z + Math.sin(angle) * auraRadius * 0.7
    );
    
    baseEffects.spawnPillar(
      pillarPos,
      (size.flames || 1.0) * 3.5,
      0.25,
      i % 2 === 0 ? colors.primary || "#ffd700" : colors.accent || "#ffff00",
      0.7
    );
  }
  
  // Spiral heat effect around core
  baseEffects.spawnSpiral(
    center,
    auraRadius * 0.4,
    4,
    colors.primary || "#ffd700",
    1.0,
    3
  );
  
  // Pulsing ground rings
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      baseEffects.spawnRing(
        center,
        auraRadius * (0.5 + i * 0.2),
        colors.secondary || "#ffa500",
        0.5,
        0.5,
        0.5
      );
    }, i * 200);
  }
  
  // Particle burst from core
  baseEffects.spawnParticleBurst(
    new THREE.Vector3(center.x, center.y + 1, center.z),
    30,
    colors.core || "#ffffff",
    particles.speed || 2.0,
    0.1,
    1.5
  );
}