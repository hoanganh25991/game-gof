import { SKILL_FX } from "../skills_fx.js";

/**
 * Inferno Overload Effect
 * Most powerful aura with intense visuals
 */
export default function infernoOverloadEffect(baseEffects, params) {
  const { center, radius, player, tick } = params;
  const fx = SKILL_FX.inferno_overload || {};
  const colors = {
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500",
    hand: fx.hand || "#ff6347"
  };
  
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
}