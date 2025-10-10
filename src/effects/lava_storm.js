import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Lava Storm Effect
 * 
 * UNIQUE VISUAL: Bubbling lava pools with geysers, splashing arcs,
 * and molten ground effects
 */
export default function lavaStormEffect(baseEffects, params) {
  const { center, radius, strike, strikePos } = params;
  const fx = SKILL_FX.lava_storm || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (strike && strikePos) {
    // Lava geyser eruption
    baseEffects.spawnCone(
      strikePos,
      new THREE.Vector3(0, 1, 0),
      40,
      (size.geysers || 2.0) * 3,
      colors.primary || "#ff4500",
      16,
      0.6
    );
    
    // Geyser pillar
    baseEffects.spawnPillar(
      strikePos,
      (size.geysers || 2.0) * 4,
      0.5,
      colors.secondary || "#8b0000",
      0.8
    );
    
    // Lava splash particles
    baseEffects.spawnParticleBurst(
      new THREE.Vector3(strikePos.x, strikePos.y + 3, strikePos.z),
      particles.count || 60,
      colors.primary || "#ff4500",
      particles.speed || 4.5,
      0.2,
      particles.lifetime || 1.8
    );
    
    // Splash arcs in multiple directions
    const splashCount = custom.splashArcs || 8;
    for (let i = 0; i < splashCount; i++) {
      const angle = (i / splashCount) * Math.PI * 2;
      const dist = (size.splashes || 1.0) * 3;
      const splashEnd = new THREE.Vector3(
        strikePos.x + Math.cos(angle) * dist,
        strikePos.y,
        strikePos.z + Math.sin(angle) * dist
      );
      
      const splashPeak = new THREE.Vector3(
        strikePos.x + Math.cos(angle) * dist * 0.5,
        strikePos.y + 2,
        strikePos.z + Math.sin(angle) * dist * 0.5
      );
      
      baseEffects.spawnArc(
        strikePos,
        splashEnd,
        colors.accent || "#ffa500",
        0.5,
        8,
        2.0
      );
    }
    
    // Molten pool
    baseEffects.spawnRing(
      strikePos,
      (size.lavaPool || 1.5) * 2,
      colors.secondary || "#8b0000",
      1.5,
      0.8,
      0.7
    );
    
    // Impact effect
    baseEffects.spawnImpact(
      strikePos,
      size.splashes || 1.0,
      colors.primary || "#ff4500",
      1.3
    );
    
  } else if (center) {
    // Initial lava storm activation
    const stormRadius = radius || 28;
    
    // Main lava pool
    baseEffects.spawnRing(
      center,
      stormRadius,
      colors.primary || "#ff4500",
      1.0,
      1.5,
      0.6
    );
    
    // Inner molten core
    baseEffects.spawnRing(
      center,
      stormRadius * 0.5,
      colors.secondary || "#8b0000",
      1.2,
      1.0,
      0.7
    );
    
    // Bubbling lava pools
    const bubbleCount = custom.poolBubbles || 20;
    for (let i = 0; i < bubbleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * stormRadius * 0.8;
      const bubblePos = new THREE.Vector3(
        center.x + Math.cos(angle) * dist,
        center.y,
        center.z + Math.sin(angle) * dist
      );
      
      setTimeout(() => {
        // Bubble pop
        baseEffects.spawnSphere(
          bubblePos,
          0.3 + Math.random() * 0.3,
          colors.accent || "#ffa500",
          0.4,
          0.8
        );
        
        // Small splash
        baseEffects.spawnParticleBurst(
          bubblePos,
          8,
          colors.primary || "#ff4500",
          2.0,
          0.1,
          0.8
        );
      }, i * 80);
    }
    
    // Lava geysers around the area
    const geyserCount = custom.geyserCount || 10;
    for (let i = 0; i < geyserCount; i++) {
      const angle = (i / geyserCount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = stormRadius * (0.4 + Math.random() * 0.4);
      const geyserPos = new THREE.Vector3(
        center.x + Math.cos(angle) * dist,
        center.y,
        center.z + Math.sin(angle) * dist
      );
      
      setTimeout(() => {
        baseEffects.spawnPillar(
          geyserPos,
          4 + Math.random() * 3,
          0.4,
          colors.primary || "#ff4500",
          0.8
        );
        
        baseEffects.spawnCone(
          geyserPos,
          new THREE.Vector3(0, 1, 0),
          35,
          4,
          colors.accent || "#ffa500",
          12,
          0.5
        );
      }, i * 120);
    }
    
    // Crust cracks
    const crackCount = 12;
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2;
      const crackEnd = new THREE.Vector3(
        center.x + Math.cos(angle) * stormRadius * 0.9,
        center.y,
        center.z + Math.sin(angle) * stormRadius * 0.9
      );
      
      baseEffects.spawnBeam(
        center,
        crackEnd,
        colors.crust || "#2a1a0a",
        1.5
      );
    }
  }
}