import { SKILL_FX } from "../skills_fx.js";

/**
 * Fireball Effect
 * Traveling projectile with trail and explosion on impact
 */
export default function fireballEffect(baseEffects, params) {
  const { from, to } = params;
  const fx = SKILL_FX.fireball || {};
  const colors = {
    beam: fx.beam || "#ff6347",
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500"
  };
  
  // Projectile with trail
  baseEffects.spawnProjectile(from, to, {
    color: colors.beam,
    size: 0.4,
    speed: 22,
    trail: true,
    onComplete: (hitPos) => {
      baseEffects.spawnImpact(hitPos, 1.5, colors.impact, 1.0);
      baseEffects.spawnRing(hitPos, 2.0, colors.ring, 0.3);
    }
  });
}