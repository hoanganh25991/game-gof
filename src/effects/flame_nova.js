import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

const __vA = new THREE.Vector3();
const __vB = new THREE.Vector3();

/**
 * Flame Nova Effect
 * Expanding shockwave with multiple ring pulses and radial beams
 */
export default function flameNovaEffect(baseEffects, params) {
  const { center, radius } = params;
  const fx = SKILL_FX.flame_nova || {};
  const colors = {
    beam: fx.beam || "#ff6347",
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500"
  };
  
  // Expanding shockwave
  baseEffects.spawnRing(center, radius, colors.ring, 0.5, 0.8, 0.7);
  
  // Multiple ring pulses
  setTimeout(() => {
    baseEffects.spawnRing(center, radius * 0.7, colors.ring, 0.4, 0.6, 0.6);
  }, 50);
  setTimeout(() => {
    baseEffects.spawnRing(center, radius * 0.4, colors.ring, 0.3, 0.4, 0.5);
  }, 100);
  
  // Central burst
  baseEffects.spawnImpact(center, radius * 0.3, colors.impact, 1.2);
  
  // Radial beams
  const beamCount = baseEffects.quality === "low" ? 8 : 12;
  for (let i = 0; i < beamCount; i++) {
    const ang = (i / beamCount) * Math.PI * 2;
    const target = __vA.set(
      center.x + Math.cos(ang) * radius,
      center.y + 0.3,
      center.z + Math.sin(ang) * radius
    );
    baseEffects.spawnBeam(
      __vB.set(center.x, center.y + 0.2, center.z),
      target,
      colors.beam,
      0.25
    );
  }
}