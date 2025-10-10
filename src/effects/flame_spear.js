import { SKILL_FX } from "../skills_fx.js";

/**
 * Flame Spear Effect
 * Thin, fast beam with multiple passes for intensity
 */
export default function flameSpearEffect(baseEffects, params) {
  const { from, to } = params;
  const fx = SKILL_FX.flame_spear || {};
  const colors = {
    beam: fx.beam || "#ff6347",
    impact: fx.impact || "#ffa500"
  };
  
  // Thin, fast beam with multiple passes for intensity
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      baseEffects.spawnBeam(from, to, colors.beam, 0.12);
    }, i * 20);
  }
  baseEffects.spawnImpact(to, 1.3, colors.impact, 0.9);
}