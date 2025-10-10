import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Flame Chain Effect
 * 
 * UNIQUE VISUAL: Lightning-like fire chains with branching arcs, 
 * sparking particles, and pulsing energy links between targets
 */
export default function flameChainEffect(baseEffects, params) {
  const { from, to, targets, chain } = params;
  const fx = SKILL_FX.flame_chain || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (chain && chain.length > 0) {
    // Draw chain connections with lightning-style branching
    for (let i = 0; i < chain.length - 1; i++) {
      const start = chain[i];
      const end = chain[i + 1];
      
      // Main lightning chain
      baseEffects.spawnLightning(
        start, 
        end, 
        colors.primary || "#ff4500", 
        custom.lightningBranches || 3,
        0.15
      );
      
      // Secondary wavy arc for thickness
      baseEffects.spawnArc(
        start, 
        end, 
        colors.secondary || "#ff6347", 
        0.12, 
        10, 
        custom.chainAmplitude || 0.6
      );
      
      // Spark particles along the chain
      const midPoint = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5);
      
      baseEffects.spawnParticleBurst(
        midPoint,
        particles.count || 20,
        colors.accent || "#ffd700",
        particles.speed || 2.5,
        size.sparks || 0.15,
        particles.lifetime || 0.8
      );
      
      // Impact explosion at each target
      baseEffects.spawnImpact(
        end, 
        size.impact || 1.5, 
        colors.primary || "#ff4500", 
        1.2
      );
      
      // Expanding ring at impact
      baseEffects.spawnShockwave(
        end,
        3.0,
        colors.glow || "#ff8c00",
        0.4,
        0.2
      );
      
      // Glowing sphere at connection point
      baseEffects.spawnSphere(
        end,
        0.4,
        colors.accent || "#ffd700",
        0.2,
        1.0
      );
    }
  } else if (from && to) {
    // Initial beam with lightning effect
    baseEffects.spawnLightning(
      from, 
      to, 
      colors.primary || "#ff4500", 
      custom.lightningBranches || 3,
      0.15
    );
    
    baseEffects.spawnArc(
      from, 
      to, 
      colors.secondary || "#ff6347", 
      0.15, 
      12, 
      0.5
    );
    
    baseEffects.spawnImpact(to, size.impact || 1.5, colors.primary || "#ff4500");
  }
}