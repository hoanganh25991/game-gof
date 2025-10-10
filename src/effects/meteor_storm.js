import { SKILL_FX } from "../skills_fx.js";

/**
 * Meteor Storm Effect
 * Area storm with individual meteor strikes
 */
export default function meteorStormEffect(baseEffects, params) {
  const { center, radius, strike, strikePos } = params;
  const fx = SKILL_FX.meteor_storm || {};
  const colors = {
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500"
  };
  
  if (strike && strikePos) {
    // Individual meteor strike
    baseEffects.spawnImpact(strikePos, 2.5, colors.impact, 1.2);
    baseEffects.spawnRing(strikePos, 3.0, colors.ring, 0.4, 0.5, 0.6);
  } else {
    // Initial storm activation
    baseEffects.spawnRing(center, radius, colors.ring, 1.0, 1.2, 0.5);
  }
}