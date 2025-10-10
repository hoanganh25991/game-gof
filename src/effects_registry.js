import * as THREE from "../vendor/three/build/three.module.js";
import { COLOR } from "./constants.js";
import { SKILL_FX } from "./skills_fx.js";
import { SKILL_DOCS } from "./skills_docs.js";

/**
 * Skill Effects Registry
 * 
 * Maps skill IDs to their visual effect implementations.
 * Each skill effect is a function that receives the base effects manager and skill-specific parameters.
 * 
 * This registry pattern allows:
 * - No hardcoded method names in effects.js
 * - Easy addition of new skill effects
 * - Graceful fallback for skills without custom effects
 * - Separation of concerns between base effects and skill-specific visuals
 */

const __vA = new THREE.Vector3();
const __vB = new THREE.Vector3();
const __vC = new THREE.Vector3();

/**
 * Get effect colors for a skill
 */
function getSkillColors(skillId) {
  const fx = SKILL_FX[skillId] || {};
  return {
    beam: fx.beam ?? COLOR.fire,
    arc: fx.arc ?? COLOR.accent,
    impact: fx.impact ?? COLOR.fire,
    ring: fx.ring ?? COLOR.ember,
    hand: fx.hand ?? COLOR.ember,
    shake: fx.shake ?? 0.2
  };
}

/**
 * Default effect for skills without custom implementation
 */
function defaultSkillEffect(baseEffects, params) {
  const { from, to, center, radius } = params;
  const colors = getSkillColors(params.skillId);
  
  console.warn(`[EffectsRegistry] No custom effect for skill "${params.skillId}", using default`);
  
  // Simple default: beam + impact
  if (from && to) {
    baseEffects.spawnBeam(from, to, colors.beam, 0.15);
    baseEffects.spawnImpact(to, 1.5, colors.impact);
  } else if (center) {
    baseEffects.spawnImpact(center, radius || 2, colors.impact);
    baseEffects.spawnRing(center, radius || 3, colors.ring, 0.4);
  }
}

/**
 * Skill Effect Implementations
 * Each function receives (baseEffects, params) where params contains:
 * - skillId: the skill identifier
 * - player: the casting entity
 * - from: source position (Vector3)
 * - to: target position (Vector3)
 * - center: center position for AoE (Vector3)
 * - radius: effect radius
 * - targets: array of affected entities
 * - Any other skill-specific data
 */
const SKILL_EFFECTS = {
  
  // ===== CHAIN SKILLS =====
  
  flame_chain: (baseEffects, params) => {
    const { from, to, targets, chain } = params;
    const colors = getSkillColors('flame_chain');
    
    if (chain && chain.length > 0) {
      // Draw chain connections
      for (let i = 0; i < chain.length - 1; i++) {
        const start = chain[i];
        const end = chain[i + 1];
        // Wavy flame arc between targets
        baseEffects.spawnArc(start, end, colors.arc, 0.15, 8, 0.4);
        // Impact at each hit
        baseEffects.spawnImpact(end, 1.2, colors.impact, 0.8);
      }
    } else if (from && to) {
      // Initial beam
      baseEffects.spawnArc(from, to, colors.beam, 0.15, 10, 0.5);
      baseEffects.spawnImpact(to, 1.5, colors.impact);
    }
  },

  // ===== AOE BLAST SKILLS =====
  
  inferno_blast: (baseEffects, params) => {
    const { center, radius, targets } = params;
    const colors = getSkillColors('inferno_blast');
    
    // Large expanding ring
    baseEffects.spawnRing(center, radius, colors.ring, 0.5, 1.0, 0.7);
    
    // Central explosion
    baseEffects.spawnImpact(center, radius * 0.5, colors.impact, 1.5);
    
    // Impact on each target
    if (targets) {
      targets.forEach(target => {
        const pos = target.pos ? target.pos() : target;
        baseEffects.spawnImpact(pos, 1.0, colors.impact, 0.6);
      });
    }
    
    // Radial fire beams
    const beamCount = baseEffects.quality === "low" ? 6 : (baseEffects.quality === "medium" ? 10 : 16);
    for (let i = 0; i < beamCount; i++) {
      const ang = (i / beamCount) * Math.PI * 2;
      const r = radius * 0.8;
      const target = __vA.set(
        center.x + Math.cos(ang) * r,
        center.y + 0.5,
        center.z + Math.sin(ang) * r
      );
      baseEffects.spawnBeam(
        __vB.set(center.x, center.y + 0.2, center.z),
        target,
        colors.beam,
        0.2
      );
    }
  },

  // ===== AURA SKILLS =====
  
  burning_aura: (baseEffects, params) => {
    const { center, radius, player, tick } = params;
    const colors = getSkillColors('burning_aura');
    
    if (tick) {
      // Periodic pulse effect
      baseEffects.spawnRing(center, radius, colors.ring, 0.3, 0.4, 0.4);
      
      // Small impacts on affected enemies
      if (params.targets) {
        params.targets.forEach(target => {
          const pos = target.pos ? target.pos() : target;
          baseEffects.spawnImpact(pos, 0.8, colors.impact, 0.5);
        });
      }
    } else {
      // Initial activation
      baseEffects.spawnRing(center, radius, colors.ring, 0.6, 0.6, 0.6);
      baseEffects.spawnOrbitingOrbs(player, colors.hand, { 
        count: 6, 
        radius: radius * 0.7, 
        duration: 0.8,
        size: 0.2,
        rate: 5
      });
    }
  },

  blazing_aura: (baseEffects, params) => {
    // Similar to burning_aura but more intense
    const { center, radius, player, tick } = params;
    const colors = getSkillColors('blazing_aura');
    
    if (tick) {
      baseEffects.spawnRing(center, radius, colors.ring, 0.25, 0.5, 0.5);
      if (params.targets) {
        params.targets.forEach(target => {
          const pos = target.pos ? target.pos() : target;
          baseEffects.spawnImpact(pos, 1.0, colors.impact, 0.6);
        });
      }
    } else {
      baseEffects.spawnRing(center, radius, colors.ring, 0.7, 0.7, 0.7);
      baseEffects.spawnOrbitingOrbs(player, colors.hand, { 
        count: 8, 
        radius: radius * 0.75, 
        duration: 1.0,
        size: 0.22,
        rate: 6
      });
    }
  },

  scorching_field: (baseEffects, params) => {
    const { center, radius, player, tick } = params;
    const colors = getSkillColors('scorching_field');
    
    if (tick) {
      baseEffects.spawnRing(center, radius, colors.ring, 0.3, 0.5, 0.45);
      if (params.targets) {
        params.targets.forEach(target => {
          const pos = target.pos ? target.pos() : target;
          baseEffects.spawnImpact(pos, 0.9, colors.impact, 0.55);
        });
      }
    } else {
      baseEffects.spawnRing(center, radius, colors.ring, 0.65, 0.65, 0.65);
    }
  },

  inferno_overload: (baseEffects, params) => {
    const { center, radius, player, tick } = params;
    const colors = getSkillColors('inferno_overload');
    
    if (tick) {
      baseEffects.spawnRing(center, radius, colors.ring, 0.25, 0.6, 0.6);
      if (params.targets) {
        params.targets.forEach(target => {
          const pos = target.pos ? target.pos() : target;
          baseEffects.spawnImpact(pos, 1.2, colors.impact, 0.7);
        });
      }
    } else {
      baseEffects.spawnRing(center, radius, colors.ring, 0.8, 0.8, 0.8);
      baseEffects.spawnOrbitingOrbs(player, colors.hand, { 
        count: 10, 
        radius: radius * 0.8, 
        duration: 1.2,
        size: 0.25,
        rate: 7
      });
    }
  },

  // ===== STORM SKILLS =====
  
  meteor_storm: (baseEffects, params) => {
    const { center, radius, strike, strikePos } = params;
    const colors = getSkillColors('meteor_storm');
    
    if (strike && strikePos) {
      // Individual meteor strike
      baseEffects.spawnImpact(strikePos, 2.5, colors.impact, 1.2);
      baseEffects.spawnRing(strikePos, 3.0, colors.ring, 0.4, 0.5, 0.6);
    } else {
      // Initial storm activation
      baseEffects.spawnRing(center, radius, colors.ring, 1.0, 1.2, 0.5);
    }
  },

  volcanic_wrath: (baseEffects, params) => {
    const { center, radius, strike, strikePos } = params;
    const colors = getSkillColors('volcanic_wrath');
    
    if (strike && strikePos) {
      baseEffects.spawnImpact(strikePos, 2.5, colors.impact, 1.3);
      baseEffects.spawnRing(strikePos, 2.8, colors.ring, 0.35, 0.5, 0.65);
      
      // Lava eruption effect
      const emberCount = baseEffects.quality === "low" ? 3 : 6;
      for (let i = 0; i < emberCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * 1.5;
        const from = __vA.set(
          strikePos.x + Math.cos(ang) * r,
          strikePos.y,
          strikePos.z + Math.sin(ang) * r
        );
        const to = __vB.set(
          from.x + (Math.random() - 0.5) * 2,
          from.y + 2 + Math.random() * 3,
          from.z + (Math.random() - 0.5) * 2
        );
        baseEffects.spawnBeam(from, to, colors.impact, 0.15);
      }
    } else {
      baseEffects.spawnRing(center, radius, colors.ring, 1.0, 1.0, 0.55);
    }
  },

  fire_dome: (baseEffects, params) => {
    const { center, radius, strike, strikePos } = params;
    const colors = getSkillColors('fire_dome');
    
    if (strike && strikePos) {
      baseEffects.spawnImpact(strikePos, 3.0, colors.impact, 1.4);
      baseEffects.spawnRing(strikePos, 3.5, colors.ring, 0.4, 0.6, 0.7);
    } else {
      baseEffects.spawnRing(center, radius, colors.ring, 1.2, 1.5, 0.6);
      baseEffects.spawnCage(center, radius, colors.ring, 1.0, 16, 3.0);
    }
  },

  lava_storm: (baseEffects, params) => {
    const { center, radius, strike, strikePos } = params;
    const colors = getSkillColors('lava_storm');
    
    if (strike && strikePos) {
      baseEffects.spawnImpact(strikePos, 2.5, colors.impact, 1.1);
      baseEffects.spawnRing(strikePos, 2.8, colors.ring, 0.4, 0.5, 0.6);
    } else {
      baseEffects.spawnRing(center, radius, colors.ring, 1.0, 1.0, 0.5);
    }
  },

  // ===== PROJECTILE/BEAM SKILLS =====
  
  fire_bolt: (baseEffects, params) => {
    const { from, to } = params;
    const colors = getSkillColors('fire_bolt');
    
    // Fast, straight beam
    baseEffects.spawnBeam(from, to, colors.beam, 0.15);
    baseEffects.spawnImpact(to, 1.2, colors.impact, 0.8);
  },

  fireball: (baseEffects, params) => {
    const { from, to } = params;
    const colors = getSkillColors('fireball');
    
    // Projectile with trail
    baseEffects.spawnProjectile(from, to, {
      color: colors.beam,
      size: 0.4,
      speed: 22,
      trail: true,
      onComplete: (hitPos) => {
        baseEffects.spawnImpact(hitPos, 1.5, colors.impact, 1.0);
        baseEffects.spawnRing(hitPos, 2.0, colors.ring, 0.3);
      }
    });
  },

  flame_spear: (baseEffects, params) => {
    const { from, to } = params;
    const colors = getSkillColors('flame_spear');
    
    // Thin, fast beam with multiple passes for intensity
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        baseEffects.spawnBeam(from, to, colors.beam, 0.12);
      }, i * 20);
    }
    baseEffects.spawnImpact(to, 1.3, colors.impact, 0.9);
  },

  heatwave: (baseEffects, params) => {
    const { from, to, center } = params;
    const colors = getSkillColors('heatwave');
    
    // Wide, wavy beam
    baseEffects.spawnArc(from, to, colors.beam, 0.18, 12, 0.8);
    
    // Cone effect at target
    if (center) {
      const coneRadius = 3;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const target = __vA.set(
          center.x + Math.cos(ang) * coneRadius,
          center.y,
          center.z + Math.sin(ang) * coneRadius
        );
        baseEffects.spawnBeam(center, target, colors.impact, 0.15);
      }
    }
    
    baseEffects.spawnImpact(to, 2.0, colors.impact, 1.0);
  },

  // ===== NOVA/RING SKILLS =====
  
  flame_nova: (baseEffects, params) => {
    const { center, radius } = params;
    const colors = getSkillColors('flame_nova');
    
    // Expanding shockwave
    baseEffects.spawnRing(center, radius, colors.ring, 0.5, 0.8, 0.7);
    
    // Multiple ring pulses
    setTimeout(() => {
      baseEffects.spawnRing(center, radius * 0.7, colors.ring, 0.4, 0.6, 0.6);
    }, 50);
    setTimeout(() => {
      baseEffects.spawnRing(center, radius * 0.4, colors.ring, 0.3, 0.4, 0.5);
    }, 100);
    
    // Central burst
    baseEffects.spawnImpact(center, radius * 0.3, colors.impact, 1.2);
    
    // Radial beams
    const beamCount = baseEffects.quality === "low" ? 8 : 12;
    for (let i = 0; i < beamCount; i++) {
      const ang = (i / beamCount) * Math.PI * 2;
      const target = __vA.set(
        center.x + Math.cos(ang) * radius,
        center.y + 0.3,
        center.z + Math.sin(ang) * radius
      );
      baseEffects.spawnBeam(
        __vB.set(center.x, center.y + 0.2, center.z),
        target,
        colors.beam,
        0.25
      );
    }
  },

  flame_ring: (baseEffects, params) => {
    const { center, radius } = params;
    const colors = getSkillColors('flame_ring');
    
    baseEffects.spawnRing(center, radius, colors.ring, 0.6, 0.9, 0.7);
    baseEffects.spawnImpact(center, radius * 0.4, colors.impact, 1.1);
    
    // Ring of fire pillars
    const pillarCount = baseEffects.quality === "low" ? 8 : 12;
    for (let i = 0; i < pillarCount; i++) {
      const ang = (i / pillarCount) * Math.PI * 2;
      const pos = __vA.set(
        center.x + Math.cos(ang) * radius * 0.8,
        center.y,
        center.z + Math.sin(ang) * radius * 0.8
      );
      baseEffects.spawnImpact(pos, 1.0, colors.impact, 0.7);
    }
  },

  ember_burst: (baseEffects, params) => {
    const { center, radius } = params;
    const colors = getSkillColors('ember_burst');
    
    baseEffects.spawnRing(center, radius, colors.ring, 0.4, 0.7, 0.65);
    baseEffects.spawnImpact(center, radius * 0.5, colors.impact, 1.0);
    
    // Scattered ember particles
    const emberCount = baseEffects.quality === "low" ? 12 : 20;
    for (let i = 0; i < emberCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const from = __vA.set(center.x, center.y + 0.2, center.z);
      const to = __vB.set(
        center.x + Math.cos(ang) * r,
        center.y + 0.5 + Math.random() * 1.5,
        center.z + Math.sin(ang) * r
      );
      baseEffects.spawnBeam(from, to, colors.impact, 0.15);
    }
  },

  pyroclasm: (baseEffects, params) => {
    const { center, radius } = params;
    const colors = getSkillColors('pyroclasm');
    
    // Massive explosion
    baseEffects.spawnRing(center, radius, colors.ring, 0.7, 1.2, 0.8);
    baseEffects.spawnImpact(center, radius * 0.6, colors.impact, 2.0);
    
    // Multiple shockwave rings
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const r = radius * (0.3 + i * 0.3);
        baseEffects.spawnRing(center, r, colors.ring, 0.4, 0.6, 0.6);
      }, i * 80);
    }
    
    // Explosive radial bursts
    const burstCount = baseEffects.quality === "low" ? 12 : 20;
    for (let i = 0; i < burstCount; i++) {
      const ang = (i / burstCount) * Math.PI * 2 + Math.random() * 0.3;
      const r = radius * (0.6 + Math.random() * 0.4);
      const target = __vA.set(
        center.x + Math.cos(ang) * r,
        center.y + 1 + Math.random() * 2,
        center.z + Math.sin(ang) * r
      );
      baseEffects.spawnBeam(
        __vB.set(center.x, center.y + 0.3, center.z),
        target,
        colors.beam,
        0.2
      );
    }
  },
};

/**
 * Execute a skill effect by ID
 * @param {string} skillId - The skill identifier
 * @param {BaseEffects} baseEffects - The base effects manager
 * @param {object} params - Effect parameters
 */
export function executeSkillEffect(skillId, baseEffects, params) {
  if (!skillId) {
    console.warn('[EffectsRegistry] No skillId provided');
    return;
  }
  
  const effectFn = SKILL_EFFECTS[skillId];
  
  if (effectFn) {
    try {
      effectFn(baseEffects, { ...params, skillId });
    } catch (error) {
      console.error(`[EffectsRegistry] Error executing effect for "${skillId}":`, error);
      defaultSkillEffect(baseEffects, { ...params, skillId });
    }
  } else {
    defaultSkillEffect(baseEffects, { ...params, skillId });
  }
}

/**
 * Check if a skill has a custom effect registered
 */
export function hasSkillEffect(skillId) {
  return !!SKILL_EFFECTS[skillId];
}

/**
 * Register a new skill effect at runtime
 */
export function registerSkillEffect(skillId, effectFn) {
  if (typeof effectFn !== 'function') {
    console.error(`[EffectsRegistry] Effect for "${skillId}" must be a function`);
    return false;
  }
  SKILL_EFFECTS[skillId] = effectFn;
  return true;
}

/**
 * Get all registered skill effect IDs
 */
export function getRegisteredSkillEffects() {
  return Object.keys(SKILL_EFFECTS);
}