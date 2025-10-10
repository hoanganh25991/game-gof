import { SKILL_FX } from "../skills_fx.js";

/**
 * Scorching Field Effect
 * Ground-based damage aura
 */
export default function scorchingFieldEffect(baseEffects, params) {
  const { center, radius, player, tick } = params;
  const fx = SKILL_FX.scorching_field || {};
  const colors = {
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500"
  };
  
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
}