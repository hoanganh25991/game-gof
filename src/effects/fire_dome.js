import { SKILL_FX } from "../skills_fx.js";

/**
 * Fire Dome Effect
 * Large area storm with cage effect
 */
export default function fireDomeEffect(baseEffects, params) {
  const { center, radius, strike, strikePos } = params;
  const fx = SKILL_FX.fire_dome || {};
  const colors = {
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500"
  };
  
  if (strike && strikePos) {
    baseEffects.spawnImpact(strikePos, 3.0, colors.impact, 1.4);
    baseEffects.spawnRing(strikePos, 3.5, colors.ring, 0.4, 0.6, 0.7);
  } else {
    baseEffects.spawnRing(center, radius, colors.ring, 1.2, 1.5, 0.6);
    baseEffects.spawnCage(center, radius, colors.ring, 1.0, 16, 3.0);
  }
}