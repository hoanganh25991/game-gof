import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Flame Spear Effect
 * 
 * UNIQUE VISUAL: Elongated flaming spear with glowing tip, spiral trail,
 * and piercing impact effect
 */
export default function flameSpearEffect(baseEffects, params) {
  const { from, to } = params;
  const fx = SKILL_FX.flame_spear || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  const spearLength = custom.spearLength || 3.0;
  
  // Create spear shaft (elongated beam)
  const shaftStart = from.clone();
  const shaftEnd = from.clone().add(dir.clone().multiplyScalar(spearLength * 0.7));
  
  baseEffects.spawnBeam(
    shaftStart,
    shaftEnd,
    colors.primary || "#ff4500",
    0.3
  );
  
  // Glowing spear tip
  const tipPos = from.clone().add(dir.clone().multiplyScalar(spearLength));
  baseEffects.spawnSphere(
    tipPos,
    size.tip || 0.4,
    colors.accent || "#ffd700",
    0.25,
    1.0
  );
  
  // Spear projectile with enhanced visuals
  baseEffects.spawnProjectile(from, to, {
    color: colors.primary || "#ff4500",
    size: size.spear || 0.8,
    speed: 28,
    trail: true,
    onComplete: (hitPos) => {
      // Piercing impact
      baseEffects.spawnImpact(
        hitPos,
        2.0,
        colors.accent || "#ffd700",
        1.5
      );
      
      // Pierce-through effect (beam continuing past impact)
      if (custom.pierceDepth) {
        const pierceEnd = hitPos.clone().add(dir.clone().multiplyScalar(custom.pierceDepth));
        baseEffects.spawnBeam(
          hitPos,
          pierceEnd,
          colors.accent || "#ffd700",
          0.3
        );
        
        // Secondary impact
        baseEffects.spawnImpact(
          pierceEnd,
          1.0,
          colors.secondary || "#ff6347",
          0.8
        );
      }
      
      // Explosion rings
      baseEffects.spawnShockwave(
        hitPos,
        3.0,
        colors.primary || "#ff4500",
        0.5,
        0.3
      );
      
      baseEffects.spawnShockwave(
        hitPos,
        2.0,
        colors.accent || "#ffd700",
        0.4,
        0.2
      );
      
      // Particle burst
      baseEffects.spawnParticleBurst(
        hitPos,
        particles.count || 20,
        colors.secondary || "#ff6347",
        particles.speed || 4.0,
        0.15,
        particles.lifetime || 0.8
      );
      
      // Ground scorch
      baseEffects.spawnRing(
        hitPos,
        2.5,
        colors.trail || "#ffa500",
        0.8,
        0.5,
        0.6
      );
    }
  });
  
  // Spiral trail effect
  if (custom.spiralTrail) {
    const dist = new THREE.Vector3().subVectors(to, from).length();
    const steps = Math.floor(dist / 1.5);
    
    for (let i = 0; i < steps; i++) {
      setTimeout(() => {
        const t = i / steps;
        const pos = new THREE.Vector3().lerpVectors(from, to, t);
        
        // Create spiral around spear path
        for (let j = 0; j < 4; j++) {
          const angle = (t * 8 + j * Math.PI / 2);
          const radius = 0.4;
          const offset = new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0
          );
          
          // Rotate offset to align with spear direction
          const perpDir = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
          const upDir = new THREE.Vector3().crossVectors(dir, perpDir);
          const rotatedOffset = perpDir.clone().multiplyScalar(offset.x)
            .add(upDir.clone().multiplyScalar(offset.y));
          
          baseEffects.spawnSphere(
            pos.clone().add(rotatedOffset),
            0.08,
            colors.trail || "#ffa500",
            0.2,
            0.7
          );
        }
      }, i * 25);
    }
  }
  
  // Tip glow trail
  if (custom.tipGlow) {
    const steps = 15;
    for (let i = 0; i < steps; i++) {
      setTimeout(() => {
        const t = i / steps;
        const pos = new THREE.Vector3().lerpVectors(from, to, t);
        
        baseEffects.spawnSphere(
          pos,
          (size.tip || 0.4) * (custom.tipGlow || 2.0) * (1 - t * 0.5),
          colors.accent || "#ffd700",
          0.15,
          0.6
        );
      }, i * 30);
    }
  }
}