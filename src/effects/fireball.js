import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Fireball Effect
 * 
 * UNIQUE VISUAL: Spinning fireball with spiral trail, layered explosion
 * with expanding rings and particle debris
 */
export default function fireballEffect(baseEffects, params) {
  const { from, to } = params;
  const fx = SKILL_FX.fireball || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  // Spinning fireball projectile with enhanced trail
  baseEffects.spawnProjectile(from, to, {
    color: colors.primary || "#ff6347",
    size: size.ball || 0.6,
    speed: 22,
    trail: true,
    onComplete: (hitPos) => {
      // Multi-layered explosion
      // Core flash
      baseEffects.spawnSphere(
        hitPos,
        (size.explosion || 2.0) * 0.8,
        colors.explosion || "#ffff00",
        0.2,
        1.0
      );
      
      // Main explosion
      baseEffects.spawnImpact(
        hitPos, 
        size.explosion || 2.0, 
        colors.primary || "#ff6347", 
        1.3
      );
      
      // Multiple expanding rings
      const ringCount = custom.explosionRings || 3;
      for (let i = 0; i < ringCount; i++) {
        setTimeout(() => {
          baseEffects.spawnShockwave(
            hitPos,
            (size.explosion || 2.0) * (i + 1) * 1.2,
            i === 0 ? colors.explosion || "#ffff00" : colors.secondary || "#ffa500",
            0.6,
            0.3
          );
        }, i * 100);
      }
      
      // Particle explosion
      baseEffects.spawnParticleBurst(
        hitPos,
        particles.count || 25,
        colors.secondary || "#ffa500",
        particles.speed || 3.0,
        0.15,
        particles.lifetime || 1.0
      );
      
      // Secondary ember burst
      setTimeout(() => {
        baseEffects.spawnParticleBurst(
          hitPos,
          15,
          colors.accent || "#ff4500",
          4.0,
          0.12,
          1.2
        );
      }, 100);
      
      // Ground scorch ring
      baseEffects.spawnRing(
        hitPos, 
        size.explosion || 2.0, 
        colors.accent || "#ff4500", 
        0.8, 
        0.4, 
        0.6
      );
    }
  });
  
  // Add spiral trail effect
  if (custom.rotation) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    const steps = Math.floor(dist / 2);
    
    for (let i = 0; i < steps; i++) {
      setTimeout(() => {
        const t = i / steps;
        const pos = new THREE.Vector3().lerpVectors(from, to, t);
        
        // Spiral particles around the path
        for (let j = 0; j < 3; j++) {
          const angle = (t * custom.rotation + j * Math.PI * 2 / 3);
          const offset = new THREE.Vector3(
            Math.cos(angle) * 0.3,
            Math.sin(angle) * 0.3,
            0
          );
          
          baseEffects.spawnSphere(
            pos.clone().add(offset),
            0.1,
            colors.secondary || "#ffa500",
            0.15,
            0.8
          );
        }
      }, i * 30);
    }
  }
}