import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Ember Burst Effect
 * 
 * UNIQUE VISUAL: Massive burst of floating embers in all directions,
 * with glowing particles and upward-floating effect
 */
export default function emberBurstEffect(baseEffects, params) {
  const { center, radius } = params;
  const fx = SKILL_FX.ember_burst || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (!center) return;
  
  const burstRadius = (radius || 15) * (size.burst || 1.2);
  
  // Central explosion
  baseEffects.spawnSphere(
    center,
    size.glow || 0.8,
    colors.primary || "#ffa500",
    0.4,
    1.0
  );
  
  // Initial shockwave
  baseEffects.spawnShockwave(
    center,
    burstRadius,
    colors.primary || "#ffa500",
    0.7,
    0.5
  );
  
  // Radial burst directions
  const directionCount = custom.burstDirections || 24;
  for (let i = 0; i < directionCount; i++) {
    const angle = (i / directionCount) * Math.PI * 2;
    const burstEnd = new THREE.Vector3(
      center.x + Math.cos(angle) * burstRadius,
      center.y + 0.5,
      center.z + Math.sin(angle) * burstRadius
    );
    
    // Radial beam
    baseEffects.spawnBeam(
      center,
      burstEnd,
      colors.secondary || "#ff8c00",
      0.3
    );
    
    // Small impact at end
    setTimeout(() => {
      baseEffects.spawnImpact(
        burstEnd,
        0.8,
        colors.accent || "#ff6347",
        0.7
      );
    }, 100);
  }
  
  // Massive ember particle burst
  const emberCount = custom.emberCount || 100;
  baseEffects.spawnParticleBurst(
    center,
    Math.min(emberCount, particles.count || 80),
    colors.ember || "#ff4500",
    particles.speed || 6.0,
    size.embers || 0.15,
    particles.lifetime || 2.0
  );
  
  // Secondary ember waves
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      50,
      colors.primary || "#ffa500",
      5.0,
      0.12,
      1.8
    );
  }, 150);
  
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      40,
      colors.secondary || "#ff8c00",
      4.0,
      0.1,
      1.5
    );
  }, 300);
  
  // Floating embers with upward drift
  if (custom.floatEffect) {
    const floatCount = 60;
    for (let i = 0; i < floatCount; i++) {
      setTimeout(() => {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * burstRadius;
        const emberPos = new THREE.Vector3(
          center.x + Math.cos(angle) * dist,
          center.y + Math.random() * 0.5,
          center.z + Math.sin(angle) * dist
        );
        
        // Upward floating path
        const endPos = emberPos.clone();
        endPos.y += 3 + Math.random() * 3;
        endPos.x += (Math.random() - 0.5) * 2;
        endPos.z += (Math.random() - 0.5) * 2;
        
        baseEffects.spawnBeam(
          emberPos,
          endPos,
          colors.ember || "#ff4500",
          2.5
        );
        
        baseEffects.spawnSphere(
          emberPos,
          size.embers || 0.15,
          colors.primary || "#ffa500",
          2.5,
          0.8
        );
      }, i * 30);
    }
  }
  
  // Pulsing glow effect
  if (custom.glowPulse) {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        baseEffects.spawnSphere(
          new THREE.Vector3(center.x, center.y + 0.5, center.z),
          (size.glow || 0.8) * (1 + i * 0.3),
          i % 2 === 0 ? colors.primary || "#ffa500" : colors.accent || "#ff6347",
          0.4,
          0.6
        );
      }, i * 200);
    }
  }
  
  // Ground rings
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      baseEffects.spawnRing(
        center,
        burstRadius * (0.4 + i * 0.3),
        i === 0 ? colors.primary || "#ffa500" : colors.secondary || "#ff8c00",
        0.8,
        0.6,
        0.5
      );
    }, i * 150);
  }
  
  // Central pillar of embers
  baseEffects.spawnPillar(
    center,
    4,
    0.6,
    colors.primary || "#ffa500",
    0.8
  );
  
  // Cone burst upward
  baseEffects.spawnCone(
    center,
    new THREE.Vector3(0, 1, 0),
    50,
    5,
    colors.accent || "#ff6347",
    20,
    0.6
  );
}