import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

const __vA = new THREE.Vector3();
const __vB = new THREE.Vector3();

/**
 * Ember Burst Effect
 * Burst with scattered ember particles
 */
export default function emberBurstEffect(baseEffects, params) {
  const { center, radius } = params;
  const fx = SKILL_FX.ember_burst || {};
  const colors = {
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500"
  };
  
  baseEffects.spawnRing(center, radius, colors.ring, 0.4, 0.7, 0.65);
  baseEffects.spawnImpact(center, radius * 0.5, colors.impact, 1.0);
  
  // Scattered ember particles
  const emberCount = baseEffects.quality === "low" ? 12 : 20;
  for (let i = 0; i < emberCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    const from = __vA.set(center.x, center.y + 0.2, center.z);
    const to = __vB.set(
      center.x + Math.cos(ang) * r,
      center.y + 0.5 + Math.random() * 1.5,
      center.z + Math.sin(ang) * r
    );
    baseEffects.spawnBeam(from, to, colors.impact, 0.15);
  }
}