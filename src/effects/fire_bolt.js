import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Fire Bolt Effect
 * 
 * UNIQUE VISUAL: Fast segmented bolt with sparking trail and concentrated impact
 */
export default function fireBoltEffect(baseEffects, params) {
  const { from, to } = params;
  const fx = SKILL_FX.fire_bolt || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  // Segmented bolt effect (multiple connected beams)
  const segments = custom.boltSegments || 8;
  const dir = new THREE.Vector3().subVectors(to, from);
  const segmentLength = dir.length() / segments;
  
  for (let i = 0; i < segments; i++) {
    const t1 = i / segments;
    const t2 = (i + 1) / segments;
    const p1 = new THREE.Vector3().lerpVectors(from, to, t1);
    const p2 = new THREE.Vector3().lerpVectors(from, to, t2);
    
    // Alternate colors for segments
    const segmentColor = i % 2 === 0 
      ? colors.primary || "#ff6347"
      : colors.secondary || "#ffa500";
    
    baseEffects.spawnBeam(p1, p2, segmentColor, 0.2);
    
    // Segment glow
    baseEffects.spawnSphere(
      p1,
      (size.bolt || 0.3) * 0.8,
      colors.accent || "#ffd700",
      0.15,
      0.8
    );
  }
  
  // Main projectile
  baseEffects.spawnProjectile(from, to, {
    color: colors.primary || "#ff6347",
    size: size.bolt || 0.3,
    speed: 32,
    trail: true,
    onComplete: (hitPos) => {
      // Concentrated impact
      baseEffects.spawnImpact(
        hitPos,
        size.impact || 1.2,
        colors.accent || "#ffd700",
        1.2
      );
      
      // Impact flash
      baseEffects.spawnSphere(
        hitPos,
        size.impact || 1.2,
        colors.accent || "#ffd700",
        0.2,
        1.0
      );
      
      // Shockwave
      baseEffects.spawnShockwave(
        hitPos,
        2.5,
        colors.primary || "#ff6347",
        0.4,
        0.2
      );
      
      // Spark burst
      baseEffects.spawnParticleBurst(
        hitPos,
        particles.count || 15,
        colors.accent || "#ffd700",
        particles.speed || 2.0,
        0.08,
        particles.lifetime || 0.6
      );
      
      // Ground ring
      baseEffects.spawnRing(
        hitPos,
        1.5,
        colors.trail || "#ff8c00",
        0.5,
        0.3,
        0.5
      );
    }
  });
  
  // Trailing sparks
  const sparkCount = custom.sparkCount || 12;
  for (let i = 0; i < sparkCount; i++) {
    setTimeout(() => {
      const t = i / sparkCount;
      const pos = new THREE.Vector3().lerpVectors(from, to, t);
      
      // Random spark offset
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      );
      
      baseEffects.spawnSphere(
        pos.clone().add(offset),
        0.1,
        colors.accent || "#ffd700",
        0.2,
        0.9
      );
    }, i * 20);
  }
  
  // Piercing effect (if enabled)
  if (custom.pierceEffect) {
    const pierceDir = dir.clone().normalize();
    const pierceStart = from.clone().sub(pierceDir.clone().multiplyScalar(0.5));
    
    baseEffects.spawnBeam(
      pierceStart,
      to,
      colors.accent || "#ffd700",
      0.15
    );
  }
}