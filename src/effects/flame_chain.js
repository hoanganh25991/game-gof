import { SKILL_FX } from "../skills_fx.js";

/**
 * Flame Chain Effect
 * Draws wavy arcs between chained targets with impacts
 */
export default function flameChainEffect(baseEffects, params) {
  const { from, to, targets, chain } = params;
  const fx = SKILL_FX.flame_chain || {};
  const colors = {
    beam: fx.beam || "#ff6347",
    arc: fx.arc || "#ff4500",
    impact: fx.impact || "#ffa500"
  };
  
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
}