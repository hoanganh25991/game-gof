import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

const __vA = new THREE.Vector3();
const __vB = new THREE.Vector3();

/**
 * Inferno Blast Effect
 * Large AOE explosion with expanding ring and radial beams
 */
export default function infernoBlastEffect(baseEffects, params) {
  const { center, radius, targets } = params;
  const fx = SKILL_FX.inferno_blast || {};
  const colors = {
    beam: fx.beam || "#ff6347",
    ring: fx.ring || "#ff8c00",
    impact: fx.impact || "#ffa500"
  };
  
  // Large expanding ring
  baseEffects.spawnRing(center, radius, colors.ring, 0.5, 1.0, 0.7);
  
  // Central explosion
  baseEffects.spawnImpact(center, radius * 0.5, colors.impact, 1.5);
  
  // Impact on each target
  if (targets) {
    targets.forEach(target => {
      const pos = target.pos ? target.pos() : target;
      baseEffects.spawnImpact(pos, 1.0, colors.impact, 0.6);
    });
  }
  
  // Radial fire beams
  const beamCount = baseEffects.quality === "low" ? 6 : (baseEffects.quality === "medium" ? 10 : 16);
  for (let i = 0; i < beamCount; i++) {
    const ang = (i / beamCount) * Math.PI * 2;
    const r = radius * 0.8;
    const target = __vA.set(
      center.x + Math.cos(ang) * r,
      center.y + 0.5,
      center.z + Math.sin(ang) * r
    );
    baseEffects.spawnBeam(
      __vB.set(center.x, center.y + 0.2, center.z),
      target,
      colors.beam,
      0.2
    );
  }
}