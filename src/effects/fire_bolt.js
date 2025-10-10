import { SKILL_FX } from "../skills_fx.js";

/**
 * Fire Bolt Effect
 * Fast, straight beam attack
 */
export default function fireBoltEffect(baseEffects, params) {
  const { from, to } = params;
  const fx = SKILL_FX.fire_bolt || {};
  const colors = {
    beam: fx.beam || "#ff6347",
    impact: fx.impact || "#ffa500"
  };
  
  // Fast, straight beam
  baseEffects.spawnBeam(from, to, colors.beam, 0.15);
  baseEffects.spawnImpact(to, 1.2, colors.impact, 0.8);
}