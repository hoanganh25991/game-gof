import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Scorching Field Effect
 * 
 * UNIQUE VISUAL: Burning ground with cracks, flame spouts erupting from fissures,
 * and persistent heat waves
 */
export default function scorchingFieldEffect(baseEffects, params) {
  const { center, radius, activation } = params;
  const fx = SKILL_FX.scorching_field || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (!center) return;
  
  const fieldRadius = (radius || 13) * (size.field || 1.0);
  
  if (activation) {
    // Initial field activation
    baseEffects.spawnRing(
      center,
      fieldRadius,
      colors.primary || "#ff6347",
      1.0,
      1.0,
      0.6
    );
    
    baseEffects.spawnShockwave(
      center,
      fieldRadius * 1.1,
      colors.accent || "#ff4500",
      0.7,
      0.4
    );
  }
  
  // Scorched ground (dark red base)
  baseEffects.spawnRing(
    center,
    fieldRadius,
    colors.ground || "#8b0000",
    1.5,
    1.5,
    0.7
  );
  
  // Radiating ground cracks
  const crackCount = custom.groundCracks || 12;
  for (let i = 0; i < crackCount; i++) {
    const angle = (i / crackCount) * Math.PI * 2 + Math.random() * 0.3;
    const crackLength = fieldRadius * (0.7 + Math.random() * 0.3);
    const crackEnd = new THREE.Vector3(
      center.x + Math.cos(angle) * crackLength,
      center.y,
      center.z + Math.sin(angle) * crackLength
    );
    
    // Main crack line
    baseEffects.spawnBeam(
      center,
      crackEnd,
      colors.secondary || "#ff8c00",
      1.5
    );
    
    // Glowing crack segments
    const segments = 6;
    for (let j = 1; j < segments; j++) {
      const t = j / segments;
      const segmentPos = new THREE.Vector3().lerpVectors(center, crackEnd, t);
      
      baseEffects.spawnSphere(
        segmentPos,
        size.cracks || 0.3,
        colors.accent || "#ff4500",
        1.2,
        0.6
      );
    }
  }
  
  // Flame spouts erupting from cracks
  const spoutCount = custom.flameSpouts || 8;
  for (let i = 0; i < spoutCount; i++) {
    const angle = (i / spoutCount) * Math.PI * 2;
    const dist = fieldRadius * (0.4 + Math.random() * 0.4);
    const spoutPos = new THREE.Vector3(
      center.x + Math.cos(angle) * dist,
      center.y,
      center.z + Math.sin(angle) * dist
    );
    
    setTimeout(() => {
      // Flame geyser
      baseEffects.spawnPillar(
        spoutPos,
        (size.flames || 0.9) * 3,
        0.3,
        colors.primary || "#ff6347",
        0.8
      );
      
      // Cone burst
      baseEffects.spawnCone(
        spoutPos,
        new THREE.Vector3(0, 1, 0),
        30,
        3,
        colors.accent || "#ff4500",
        10,
        0.5
      );
      
      // Particles
      baseEffects.spawnParticleBurst(
        new THREE.Vector3(spoutPos.x, spoutPos.y + 2, spoutPos.z),
        15,
        colors.secondary || "#ff8c00",
        3.0,
        0.12,
        1.2
      );
    }, i * 150);
  }
  
  // Heat waves (if enabled)
  if (custom.heatWaves) {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        baseEffects.spawnShockwave(
          center,
          fieldRadius * 0.8,
          colors.primary || "#ff6347",
          0.6,
          0.3
        );
      }, i * 400);
    }
  }
  
  // Floating embers across the field
  const emberCount = particles.count || 35;
  for (let i = 0; i < emberCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * fieldRadius;
    const emberPos = new THREE.Vector3(
      center.x + Math.cos(angle) * dist,
      center.y + Math.random() * 0.3,
      center.z + Math.sin(angle) * dist
    );
    
    // Upward floating ember
    const endPos = emberPos.clone();
    endPos.y += 2 + Math.random() * 1.5;
    
    baseEffects.spawnBeam(
      emberPos,
      endPos,
      colors.accent || "#ff4500",
      particles.lifetime || 2.5
    );
    
    baseEffects.spawnSphere(
      emberPos,
      0.1,
      colors.secondary || "#ff8c00",
      particles.lifetime || 2.5,
      0.7
    );
  }
  
  // Inner ring of intense heat
  baseEffects.spawnRing(
    center,
    fieldRadius * 0.4,
    colors.accent || "#ff4500",
    1.0,
    0.8,
    0.6
  );
  
  // Central heat pillar
  baseEffects.spawnPillar(
    center,
    2.5,
    0.5,
    colors.primary || "#ff6347",
    1.0
  );
}