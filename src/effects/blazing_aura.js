import { SKILL_FX } from "../skills_fx.js";

/**
 * Blazing Aura Effect
 * More intense version of burning aura
 */
export default function blazingAuraEffect(baseEffects, params) {
  const { center, radius, player, tick } = params;
  const fx = SKILL_FX.blazing_aura || {};
  const colors = {
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500",
    hand: fx.hand || "#ff6347"
  };
  
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
}