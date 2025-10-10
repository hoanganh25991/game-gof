import { SKILL_FX } from "../skills_fx.js";

/**
 * Burning Aura Effect
 * Periodic pulse effect with orbiting particles
 */
export default function burningAuraEffect(baseEffects, params) {
  const { center, radius, player, tick } = params;
  const fx = SKILL_FX.burning_aura || {};
  const colors = {
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500",
    hand: fx.hand || "#ff6347"
  };
  
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
}