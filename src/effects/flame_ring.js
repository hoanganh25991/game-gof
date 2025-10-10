import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Flame Ring Effect
 * 
 * UNIQUE VISUAL: Rotating concentric rings with flame spouts, spinning fire effect,
 * and pulsing energy
 */
export default function flameRingEffect(baseEffects, params) {
  const { center, radius } = params;
  const fx = SKILL_FX.flame_ring || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (!center) return;
  
  const ringRadius = (radius || 18) * (size.ring || 1.0);
  
  // Multiple concentric rings
  const layerCount = custom.ringLayers || 3;
  for (let i = 0; i < layerCount; i++) {
    const layerRadius = ringRadius * (0.4 + i * 0.3);
    const layerColor = i === 0
      ? colors.inner || "#ffd700"
      : i === 1
        ? colors.primary || "#ff6347"
        : colors.secondary || "#ff4500";
    
    setTimeout(() => {
      baseEffects.spawnRing(
        center,
        layerRadius,
        layerColor,
        1.0,
        size.thickness || 0.5,
        0.6
      );
      
      // Expanding shockwave for each layer
      baseEffects.spawnShockwave(
        center,
        layerRadius * 1.2,
        layerColor,
        0.6,
        0.3
      );
    }, i * 150);
  }
  
  // Flame spouts around the ring perimeter
  const spoutCount = custom.flameSpouts || 12;
  for (let i = 0; i < spoutCount; i++) {
    const angle = (i / spoutCount) * Math.PI * 2;
    const spoutPos = new THREE.Vector3(
      center.x + Math.cos(angle) * ringRadius,
      center.y,
      center.z + Math.sin(angle) * ringRadius
    );
    
    setTimeout(() => {
      // Vertical flame pillar
      baseEffects.spawnPillar(
        spoutPos,
        (size.flames || 1.0) * 3,
        0.3,
        colors.primary || "#ff6347",
        0.8
      );
      
      // Inward beam toward center
      baseEffects.spawnBeam(
        spoutPos,
        new THREE.Vector3(center.x, center.y + 1, center.z),
        colors.inner || "#ffd700",
        0.5
      );
      
      // Small explosion at spout
      baseEffects.spawnImpact(
        spoutPos,
        0.8,
        colors.accent || "#ffa500",
        0.8
      );
    }, i * 80);
  }
  
  // Rotating fire effect (spiral beams)
  const rotationBeams = 8;
  for (let i = 0; i < rotationBeams; i++) {
    const angle = (i / rotationBeams) * Math.PI * 2;
    const beamStart = new THREE.Vector3(
      center.x + Math.cos(angle) * ringRadius * 0.3,
      center.y + 0.5,
      center.z + Math.sin(angle) * ringRadius * 0.3
    );
    const beamEnd = new THREE.Vector3(
      center.x + Math.cos(angle + Math.PI / 4) * ringRadius * 0.9,
      center.y + 0.5,
      center.z + Math.sin(angle + Math.PI / 4) * ringRadius * 0.9
    );
    
    setTimeout(() => {
      baseEffects.spawnArc(
        beamStart,
        beamEnd,
        colors.secondary || "#ff4500",
        0.6,
        10,
        1.0
      );
    }, i * 60);
  }
  
  // Particle ring burst
  baseEffects.spawnParticleBurst(
    center,
    particles.count || 45,
    colors.accent || "#ffa500",
    particles.speed || 3.5,
    0.15,
    particles.lifetime || 1.5
  );
  
  // Secondary particle wave
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      30,
      colors.inner || "#ffd700",
      4.0,
      0.12,
      1.2
    );
  }, 200);
  
  // Pulsing center
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      baseEffects.spawnSphere(
        new THREE.Vector3(center.x, center.y + 0.5, center.z),
        0.6 + i * 0.2,
        i % 2 === 0 ? colors.inner || "#ffd700" : colors.primary || "#ff6347",
        0.4,
        0.7
      );
    }, i * 250);
  }
  
  // Ground impact rings
  baseEffects.spawnRing(
    center,
    ringRadius,
    colors.primary || "#ff6347",
    0.8,
    0.8,
    0.6
  );
  
  // Inner glow ring
  baseEffects.spawnRing(
    center,
    ringRadius * 0.3,
    colors.inner || "#ffd700",
    1.0,
    0.6,
    0.7
  );
  
  // Central pillar
  baseEffects.spawnPillar(
    center,
    3,
    0.4,
    colors.inner || "#ffd700",
    1.0
  );
}