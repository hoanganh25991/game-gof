import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Inferno Blast Effect
 * 
 * UNIQUE VISUAL: Massive explosion with multiple shockwave rings,
 * vertical fire columns, particle debris, and smoke clouds
 */
export default function infernoBlastEffect(baseEffects, params) {
  const { center, radius } = params;
  const fx = SKILL_FX.inferno_blast || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (!center) return;
  
  // Central core explosion
  baseEffects.spawnSphere(
    center,
    (size.core || 2.0) * 1.5,
    colors.accent || "#ffff00",
    0.3,
    1.0
  );
  
  // Multiple expanding shockwave rings
  const shockwaveCount = custom.shockwaveRings || 3;
  for (let i = 0; i < shockwaveCount; i++) {
    setTimeout(() => {
      baseEffects.spawnShockwave(
        center,
        (radius || 16) * (size.shockwave || 3.5) / shockwaveCount * (i + 1),
        i === 0 ? colors.accent || "#ffff00" : colors.primary || "#ff4500",
        0.8,
        0.4
      );
    }, i * 100);
  }
  
  // Vertical fire columns around the blast
  const columnCount = custom.fireColumns || 8;
  for (let i = 0; i < columnCount; i++) {
    const angle = (i / columnCount) * Math.PI * 2;
    const dist = (radius || 16) * 0.6;
    const columnPos = new THREE.Vector3(
      center.x + Math.cos(angle) * dist,
      center.y,
      center.z + Math.sin(angle) * dist
    );
    
    baseEffects.spawnPillar(
      columnPos,
      (size.flames || 1.8) * 4,
      0.4,
      colors.primary || "#ff4500",
      0.6
    );
  }
  
  // Massive particle explosion
  baseEffects.spawnParticleBurst(
    center,
    particles.count || 50,
    colors.primary || "#ff4500",
    particles.speed || 8.0,
    0.2,
    particles.lifetime || 1.2
  );
  
  // Secondary particle burst (embers)
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      center,
      30,
      colors.secondary || "#ff6347",
      5.0,
      0.15,
      1.5
    );
  }, 150);
  
  // Cone blast upward
  baseEffects.spawnCone(
    center,
    new THREE.Vector3(0, 1, 0),
    45,
    size.flames || 1.8 * 3,
    colors.accent || "#ffff00",
    16,
    0.4
  );
  
  // Ground impact ring
  baseEffects.spawnRing(
    center,
    radius || 16,
    colors.primary || "#ff4500",
    1.0,
    1.2,
    0.6
  );
  
  // Smoke particles (dark)
  setTimeout(() => {
    baseEffects.spawnParticleBurst(
      new THREE.Vector3(center.x, center.y + 2, center.z),
      20,
      colors.smoke || "#2a2a2a",
      3.0,
      0.4,
      2.0
    );
  }, 300);
}