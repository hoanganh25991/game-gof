import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Volcanic Wrath Effect
 * 
 * UNIQUE VISUAL: Erupting volcano with lava fountains, smoke columns,
 * flying lava bombs, and molten ground effects
 */
export default function volcanicWrathEffect(baseEffects, params) {
  const { center, radius, strike, strikePos } = params;
  const fx = SKILL_FX.volcanic_wrath || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (strike && strikePos) {
    // Individual lava bomb impact
    baseEffects.spawnSphere(
      strikePos,
      size.lava || 1.5,
      colors.primary || "#ff4500",
      0.4,
      1.0
    );
    
    baseEffects.spawnImpact(
      strikePos,
      size.lava || 1.5,
      colors.primary || "#ff4500",
      1.2
    );
    
    // Lava splash
    baseEffects.spawnParticleBurst(
      strikePos,
      20,
      colors.secondary || "#8b0000",
      4.0,
      0.2,
      1.0
    );
    
    // Molten ground pool
    baseEffects.spawnRing(
      strikePos,
      size.lava || 1.5,
      colors.secondary || "#8b0000",
      1.5,
      0.6,
      0.7
    );
    
  } else if (center) {
    // Main volcanic eruption
    
    // Storm area indicator
    baseEffects.spawnRing(
      center,
      radius || 24,
      colors.primary || "#ff4500",
      1.0,
      1.2,
      0.5
    );
    
    // Central volcano cone
    baseEffects.spawnPillar(
      center,
      (size.volcano || 2.0) * 6,
      1.2,
      colors.primary || "#ff4500",
      1.5
    );
    
    // Lava fountains around the area
    const fountainCount = custom.lavaFountains || 5;
    for (let i = 0; i < fountainCount; i++) {
      const angle = (i / fountainCount) * Math.PI * 2;
      const dist = (radius || 24) * (0.3 + Math.random() * 0.4);
      const fountainPos = new THREE.Vector3(
        center.x + Math.cos(angle) * dist,
        center.y,
        center.z + Math.sin(angle) * dist
      );
      
      setTimeout(() => {
        // Lava geyser
        baseEffects.spawnCone(
          fountainPos,
          new THREE.Vector3(0, 1, 0),
          35,
          6,
          colors.primary || "#ff4500",
          16,
          0.8
        );
        
        // Fountain pillar
        baseEffects.spawnPillar(
          fountainPos,
          8,
          0.6,
          colors.secondary || "#8b0000",
          1.0
        );
        
        // Lava particles
        baseEffects.spawnParticleBurst(
          new THREE.Vector3(fountainPos.x, fountainPos.y + 4, fountainPos.z),
          30,
          colors.primary || "#ff4500",
          5.0,
          0.2,
          1.5
        );
      }, i * 150);
    }
    
    // Smoke columns (dark)
    const smokeCount = custom.smokeColumns || 8;
    for (let i = 0; i < smokeCount; i++) {
      const angle = (i / smokeCount) * Math.PI * 2;
      const dist = (radius || 24) * 0.6;
      const smokePos = new THREE.Vector3(
        center.x + Math.cos(angle) * dist,
        center.y,
        center.z + Math.sin(angle) * dist
      );
      
      setTimeout(() => {
        baseEffects.spawnPillar(
          smokePos,
          (size.smoke || 3.0) * 4,
          0.8,
          colors.smoke || "#1a1a1a",
          2.0
        );
        
        // Smoke particles
        baseEffects.spawnParticleBurst(
          new THREE.Vector3(smokePos.x, smokePos.y + 6, smokePos.z),
          15,
          colors.smoke || "#1a1a1a",
          2.0,
          0.4,
          3.0
        );
      }, i * 100 + 300);
    }
    
    // Flying lava bombs (arcing projectiles)
    const bombCount = custom.lavaBombs || 12;
    for (let i = 0; i < bombCount; i++) {
      setTimeout(() => {
        const angle = Math.random() * Math.PI * 2;
        const dist = (radius || 24) * (0.5 + Math.random() * 0.5);
        const targetPos = new THREE.Vector3(
          center.x + Math.cos(angle) * dist,
          center.y,
          center.z + Math.sin(angle) * dist
        );
        
        const launchPos = new THREE.Vector3(
          center.x,
          center.y + 8,
          center.z
        );
        
        // Lava bomb trail
        baseEffects.spawnArc(
          launchPos,
          targetPos,
          colors.primary || "#ff4500",
          0.6,
          12,
          3.0
        );
        
        // Impact at landing
        setTimeout(() => {
          baseEffects.spawnImpact(targetPos, 1.5, colors.primary || "#ff4500", 1.0);
          baseEffects.spawnRing(targetPos, 2.0, colors.secondary || "#8b0000", 1.0, 0.5, 0.6);
        }, 400);
      }, i * 100);
    }
    
    // Massive particle eruption from center
    setTimeout(() => {
      baseEffects.spawnParticleBurst(
        new THREE.Vector3(center.x, center.y + 6, center.z),
        particles.count || 70,
        colors.accent || "#ffd700",
        particles.speed || 5.0,
        0.2,
        particles.lifetime || 2.0
      );
    }, 200);
  }
}