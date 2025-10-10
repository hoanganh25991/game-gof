import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

const __vA = new THREE.Vector3();

/**
 * Heatwave Effect
 * Wide, wavy beam with cone effect at target
 */
export default function heatwaveEffect(baseEffects, params) {
  const { from, to, center } = params;
  const fx = SKILL_FX.heatwave || {};
  const colors = {
    beam: fx.beam || "#ff6347",
    impact: fx.impact || "#ffa500"
  };
  
  // Wide, wavy beam
  baseEffects.spawnArc(from, to, colors.beam, 0.18, 12, 0.8);
  
  // Cone effect at target
  if (center) {
    const coneRadius = 3;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const target = __vA.set(
        center.x + Math.cos(ang) * coneRadius,
        center.y,
        center.z + Math.sin(ang) * coneRadius
      );
      baseEffects.spawnBeam(center, target, colors.impact, 0.15);
    }
  }
  
  baseEffects.spawnImpact(to, 2.0, colors.impact, 1.0);
}