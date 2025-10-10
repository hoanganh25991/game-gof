import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

const __vA = new THREE.Vector3();

/**
 * Flame Ring Effect
 * Ring with fire pillars around the perimeter
 */
export default function flameRingEffect(baseEffects, params) {
  const { center, radius } = params;
  const fx = SKILL_FX.flame_ring || {};
  const colors = {
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500"
  };
  
  baseEffects.spawnRing(center, radius, colors.ring, 0.6, 0.9, 0.7);
  baseEffects.spawnImpact(center, radius * 0.4, colors.impact, 1.1);
  
  // Ring of fire pillars
  const pillarCount = baseEffects.quality === "low" ? 8 : 12;
  for (let i = 0; i < pillarCount; i++) {
    const ang = (i / pillarCount) * Math.PI * 2;
    const pos = __vA.set(
      center.x + Math.cos(ang) * radius * 0.8,
      center.y,
      center.z + Math.sin(ang) * radius * 0.8
    );
    baseEffects.spawnImpact(pos, 1.0, colors.impact, 0.7);
  }
}