import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Burning Aura Effect
 * 
 * UNIQUE VISUAL: Pulsing concentric flame rings with floating embers,
 * vertical flame spouts, and heat distortion effect
 */
export default function burningAuraEffect(baseEffects, params) {
  const { center, radius, activation } = params;
  const fx = SKILL_FX.burning_aura || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (!center) return;
  
  const auraRadius = (radius || 14) * (size.aura || 1.0);
  
  if (activation) {
    // Initial activation burst
    baseEffects.spawnRing(
      center,
      auraRadius,
      colors.primary || "#ff8c00",
      1.0,
      1.0,
      0.6
    );
    
    // Expanding shockwave
    baseEffects.spawnShockwave(
      center,
      auraRadius * 1.2,
      colors.accent || "#ff6347",
      0.8,
      0.4
    );
  }
  
  // Concentric flame rings
  const ringCount = custom.flameRings || 2;
  for (let i = 0; i < ringCount; i++) {
    const ringRadius = auraRadius * (0.4 + i * 0.3);
    baseEffects.spawnRing(
      center,
      ringRadius,
      i === 0 ? colors.primary || "#ff8c00" : colors.secondary || "#ffa500",
      0.5,
      0.6,
      0.5
    );
  }
  
  // Floating ember particles
  const emberCount = Math.floor((particles.count || 30) * (custom.emberDensity || 1.5));
  for (let i = 0; i < emberCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * auraRadius;
    const emberPos = new THREE.Vector3(
      center.x + Math.cos(angle) * dist,
      center.y + Math.random() * 0.5,
      center.z + Math.sin(angle) * dist
    );
    
    // Create upward-floating ember
    const ember = new THREE.Vector3(
      emberPos.x,
      emberPos.y + 2 + Math.random() * 2,
      emberPos.z
    );
    
    baseEffects.spawnBeam(
      emberPos,
      ember,
      colors.ember || "#ff4500",
      particles.lifetime || 2.0
    );
    
    // Small glowing ember sphere
    baseEffects.spawnSphere(
      emberPos,
      size.embers || 0.12,
      colors.accent || "#ff6347",
      particles.lifetime || 2.0,
      0.8
    );
  }
  
  // Flame spouts around the perimeter
  const spoutCount = 8;
  for (let i = 0; i < spoutCount; i++) {
    const angle = (i / spoutCount) * Math.PI * 2;
    const spoutPos = new THREE.Vector3(
      center.x + Math.cos(angle) * auraRadius * 0.8,
      center.y,
      center.z + Math.sin(angle) * auraRadius * 0.8
    );
    
    baseEffects.spawnPillar(
      spoutPos,
      (size.flames || 0.8) * 2.5,
      0.2,
      colors.secondary || "#ffa500",
      0.6
    );
  }
  
  // Central glow
  baseEffects.spawnSphere(
    new THREE.Vector3(center.x, center.y + 0.5, center.z),
    0.6,
    colors.primary || "#ff8c00",
    0.5,
    0.4
  );
}