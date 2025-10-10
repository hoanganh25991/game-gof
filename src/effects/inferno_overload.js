import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Inferno Overload Effect
 * 
 * UNIQUE VISUAL: Explosive overload with spiraling fire streams, multiple explosion waves,
 * and intense particle bursts
 */
export default function infernoOverloadEffect(baseEffects, params) {
  const { center, radius, activation } = params;
  const fx = SKILL_FX.inferno_overload || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (!center) return;
  
  const overloadRadius = (radius || 15) * (size.aura || 1.5);
  
  if (activation) {
    // Massive activation explosion
    baseEffects.spawnSphere(
      center,
      size.explosion || 2.5,
      colors.explosion || "#ffff00",
      0.5,
      1.0
    );
    
    // Multiple explosion waves
    const waveCount = custom.explosionWaves || 4;
    for (let i = 0; i < waveCount; i++) {
      setTimeout(() => {
        baseEffects.spawnShockwave(
          center,
          overloadRadius * (i + 1) / waveCount,
          i === 0 ? colors.explosion || "#ffff00" : colors.primary || "#ff4500",
          0.7,
          0.5
        );
      }, i * 120);
    }
    
    // Upward explosion cone
    baseEffects.spawnCone(
      center,
      new THREE.Vector3(0, 1, 0),
      70,
      6,
      colors.accent || "#ffd700",
      24,
      0.6
    );
  }
  
  // Spiraling fire streams
  const spiralCount = custom.fireSpirals || 6;
  for (let i = 0; i < spiralCount; i++) {
    const angle = (i / spiralCount) * Math.PI * 2;
    const spiralCenter = new THREE.Vector3(
      center.x + Math.cos(angle) * overloadRadius * 0.5,
      center.y,
      center.z + Math.sin(angle) * overloadRadius * 0.5
    );
    
    setTimeout(() => {
      baseEffects.spawnSpiral(
        spiralCenter,
        1.5,
        (size.flames || 1.3) * 4,
        i % 2 === 0 ? colors.primary || "#ff4500" : colors.accent || "#ffd700",
        1.2,
        4
      );
      
      // Pillar at spiral base
      baseEffects.spawnPillar(
        spiralCenter,
        (size.flames || 1.3) * 4,
        0.4,
        colors.secondary || "#ff6347",
        1.0
      );
    }, i * 100);
  }
  
  // Massive particle explosion
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      particles.count || 60,
      colors.primary || "#ff4500",
      particles.speed || 4.0,
      0.2,
      particles.lifetime || 1.5
    );
  }, 100);
  
  // Secondary particle waves
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      40,
      colors.accent || "#ffd700",
      6.0,
      0.15,
      1.3
    );
  }, 250);
  
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      30,
      colors.explosion || "#ffff00",
      5.0,
      0.12,
      1.0
    );
  }, 400);
  
  // Concentric explosion rings
  for (let i = 0; i < 4; i++) {
    const ringRadius = overloadRadius * (0.3 + i * 0.25);
    setTimeout(() => {
      baseEffects.spawnRing(
        center,
        ringRadius,
        i === 0 ? colors.explosion || "#ffff00" : colors.primary || "#ff4500",
        0.8,
        0.8,
        0.7
      );
    }, i * 150);
  }
  
  // Radiating fire beams
  const beamCount = 16;
  for (let i = 0; i < beamCount; i++) {
    const angle = (i / beamCount) * Math.PI * 2;
    const beamEnd = new THREE.Vector3(
      center.x + Math.cos(angle) * overloadRadius,
      center.y + 0.5,
      center.z + Math.sin(angle) * overloadRadius
    );
    
    setTimeout(() => {
      baseEffects.spawnBeam(
        center,
        beamEnd,
        colors.accent || "#ffd700",
        0.4
      );
      
      // Impact at beam end
      baseEffects.spawnImpact(
        beamEnd,
        1.2,
        colors.primary || "#ff4500",
        1.0
      );
    }, i * 30);
  }
  
  // Central overload pillar
  setTimeout(() => {
    baseEffects.spawnPillar(
      center,
      (size.explosion || 2.5) * 5,
      1.0,
      colors.explosion || "#ffff00",
      1.5
    );
  }, 200);
  
  // Pulsing core
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      baseEffects.spawnSphere(
        new THREE.Vector3(center.x, center.y + 1, center.z),
        1.0 + i * 0.2,
        i % 2 === 0 ? colors.explosion || "#ffff00" : colors.accent || "#ffd700",
        0.3,
        0.8
      );
    }, i * 200);
  }
  
  // Ground impact effect
  baseEffects.spawnImpact(
    center,
    size.explosion || 2.5,
    colors.explosion || "#ffff00",
    fx.intensity || 2.0
  );
}