import { SKILL_FX } from "../skills_fx.js";

/**
 * Lava Storm Effect
 * Storm with lava-themed strikes
 */
export default function lavaStormEffect(baseEffects, params) {
  const { center, radius, strike, strikePos } = params;
  const fx = SKILL_FX.lava_storm || {};
  const colors = {
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500"
  };
  
  if (strike && strikePos) {
    baseEffects.spawnImpact(strikePos, 2.5, colors.impact, 1.1);
    baseEffects.spawnRing(strikePos, 2.8, colors.ring, 0.4, 0.5, 0.6);
  } else {
    baseEffects.spawnRing(center, radius, colors.ring, 1.0, 1.0, 0.5);
  }
}