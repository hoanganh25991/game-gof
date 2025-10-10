import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Flame Nova Effect
 * 
 * UNIQUE VISUAL: Explosive radial burst with flame rays shooting outward,
 * multiple pulse waves, and a bright core explosion
 */
export default function flameNovaEffect(baseEffects, params) {
  const { center, radius } = params;
  const fx = SKILL_FX.flame_nova || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (!center) return;
  
  const novaRadius = (radius || 14) * (size.ring || 1.5);
  
  // Central core explosion
  if (custom.coreExplosion) {
    baseEffects.spawnSphere(
      center,
      size.core || 1.0,
      colors.core || "#ffff00",
      0.3,
      1.0
    );
    
    // Upward explosion cone
    baseEffects.spawnCone(
      center,
      new THREE.Vector3(0, 1, 0),
      60,
      4,
      colors.accent || "#ffd700",
      20,
      0.4
    );
  }
  
  // Multiple expanding pulse waves
  const pulseCount = custom.pulseWaves || 3;
  for (let i = 0; i < pulseCount; i++) {
    setTimeout(() => {
      baseEffects.spawnShockwave(
        center,
        novaRadius * (i + 1) / pulseCount,
        i === 0 ? colors.core || "#ffff00" : colors.primary || "#ff6347",
        0.6,
        0.4
      );
    }, i * 120);
  }
  
  // Radial flame rays
  const rayCount = custom.flameRays || 16;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const rayEnd = new THREE.Vector3(
      center.x + Math.cos(angle) * novaRadius,
      center.y + 0.5,
      center.z + Math.sin(angle) * novaRadius
    );
    
    // Main ray beam
    baseEffects.spawnBeam(
      center,
      rayEnd,
      colors.primary || "#ff6347",
      0.3
    );
    
    // Secondary thicker ray
    const midPoint = new THREE.Vector3().lerpVectors(center, rayEnd, 0.5);
    baseEffects.spawnBeam(
      center,
      midPoint,
      colors.secondary || "#ff4500",
      0.25
    );
    
    // Flame pillar at ray end
    baseEffects.spawnPillar(
      rayEnd,
      (size.flames || 1.2) * 2,
      0.25,
      colors.accent || "#ffd700",
      0.5
    );
    
    // Impact at ray end
    baseEffects.spawnImpact(
      rayEnd,
      1.0,
      colors.primary || "#ff6347",
      0.8
    );
  }
  
  // Massive particle burst
  baseEffects.spawnParticleBurst(
    center,
    particles.count || 60,
    colors.secondary || "#ff4500",
    particles.speed || 8.0,
    0.15,
    particles.lifetime || 1.2
  );
  
  // Secondary particle wave
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      40,
      colors.accent || "#ffd700",
      6.0,
      0.12,
      1.0
    );
  }, 150);
  
  // Ground ring
  baseEffects.spawnRing(
    center,
    novaRadius,
    colors.primary || "#ff6347",
    0.8,
    1.0,
    0.6
  );
}