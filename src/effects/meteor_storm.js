import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Meteor Storm Effect
 * 
 * UNIQUE VISUAL: Meteors falling from sky with long trails,
 * crater impacts with shockwaves, and lingering fire
 */
export default function meteorStormEffect(baseEffects, params) {
  const { center, radius, strike, strikePos } = params;
  const fx = SKILL_FX.meteor_storm || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (strike && strikePos) {
    // Meteor impact from above
    const skyPos = new THREE.Vector3(
      strikePos.x,
      strikePos.y + 15,
      strikePos.z
    );
    
    // Meteor trail (long beam)
    for (let i = 0; i < (custom.trailLength || 8); i++) {
      const trailStart = new THREE.Vector3(
        skyPos.x + (Math.random() - 0.5) * 0.5,
        skyPos.y - i * 1.5,
        skyPos.z + (Math.random() - 0.5) * 0.5
      );
      const trailEnd = new THREE.Vector3(
        trailStart.x,
        trailStart.y - 1.5,
        trailStart.z
      );
      
      baseEffects.spawnBeam(
        trailStart,
        trailEnd,
        i < 2 ? colors.accent || "#8b0000" : colors.primary || "#ff4500",
        0.3
      );
    }
    
    // Meteor projectile
    baseEffects.spawnSphere(
      skyPos,
      size.meteor || 1.2,
      colors.primary || "#ff4500",
      0.4,
      1.0
    );
    
    // Impact explosion
    baseEffects.spawnImpact(
      strikePos, 
      size.crater || 2.0 * 1.5, 
      colors.impact || "#ffff00", 
      1.5
    );
    
    // Multiple shockwave rings
    for (let i = 0; i < (custom.shockwaveRings || 3); i++) {
      setTimeout(() => {
        baseEffects.spawnShockwave(
          strikePos,
          (size.crater || 2.0) * (i + 1) * 1.5,
          colors.primary || "#ff4500",
          0.5,
          0.3
        );
      }, i * 80);
    }
    
    // Debris particles
    baseEffects.spawnParticleBurst(
      strikePos,
      particles.count || 40,
      colors.secondary || "#ff6347",
      particles.speed || 6.0,
      0.15,
      particles.lifetime || 1.0
    );
    
    // Crater glow (lingering fire)
    baseEffects.spawnRing(
      strikePos, 
      size.crater || 2.0, 
      colors.accent || "#8b0000", 
      custom.craterGlow || 1.5, 
      0.5, 
      0.7
    );
    
    // Upward fire cone from impact
    baseEffects.spawnCone(
      strikePos,
      new THREE.Vector3(0, 1, 0),
      35,
      3,
      colors.primary || "#ff4500",
      12,
      0.4
    );
    
  } else if (center) {
    // Initial storm activation - show storm area
    baseEffects.spawnRing(
      center, 
      radius || 30, 
      colors.primary || "#ff4500", 
      1.2, 
      1.5, 
      0.5
    );
    
    // Pulsing warning effect
    setTimeout(() => {
      baseEffects.spawnRing(
        center, 
        radius || 30, 
        colors.secondary || "#ff6347", 
        0.8, 
        1.0, 
        0.4
      );
    }, 200);
  }
}