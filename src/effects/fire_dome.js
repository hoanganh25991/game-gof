import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Fire Dome Effect
 * 
 * UNIQUE VISUAL: Protective dome of rotating fire pillars with layered shields,
 * pulsing energy, and continuous particle streams
 */
export default function fireDomeEffect(baseEffects, params) {
  const { center, radius, strike, strikePos } = params;
  const fx = SKILL_FX.fire_dome || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (strike && strikePos) {
    // Meteor strike hitting the dome
    baseEffects.spawnImpact(
      strikePos,
      2.5,
      colors.primary || "#ff6347",
      1.5
    );
    
    baseEffects.spawnShockwave(
      strikePos,
      4.0,
      colors.accent || "#ffd700",
      0.5,
      0.3
    );
    
  } else if (center) {
    // Create the dome structure
    const domeRadius = (radius || 32) * (size.dome || 1.0);
    const pillarCount = custom.domePillars || 16;
    const pillarHeight = (size.pillars || 2.5) * 4;
    
    // Base ring
    baseEffects.spawnRing(
      center,
      domeRadius,
      colors.primary || "#ff6347",
      1.2,
      1.0,
      0.6
    );
    
    // Layered shield rings
    const shieldLayers = custom.shieldLayers || 3;
    for (let layer = 0; layer < shieldLayers; layer++) {
      setTimeout(() => {
        baseEffects.spawnRing(
          center,
          domeRadius * (0.7 + layer * 0.15),
          layer === 0 ? colors.shield || "#ff8c00" : colors.secondary || "#ff4500",
          0.8,
          0.6,
          0.5
        );
      }, layer * 150);
    }
    
    // Vertical pillars forming dome perimeter
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const pillarPos = new THREE.Vector3(
        center.x + Math.cos(angle) * domeRadius,
        center.y,
        center.z + Math.sin(angle) * domeRadius
      );
      
      setTimeout(() => {
        baseEffects.spawnPillar(
          pillarPos,
          pillarHeight,
          0.4,
          colors.primary || "#ff6347",
          1.5
        );
        
        // Connecting arcs between pillars (dome structure)
        if (i < pillarCount - 1) {
          const nextAngle = ((i + 1) / pillarCount) * Math.PI * 2;
          const nextPos = new THREE.Vector3(
            center.x + Math.cos(nextAngle) * domeRadius,
            center.y + pillarHeight * 0.7,
            center.z + Math.sin(nextAngle) * domeRadius
          );
          
          const currentTop = new THREE.Vector3(
            pillarPos.x,
            pillarPos.y + pillarHeight * 0.7,
            pillarPos.z
          );
          
          baseEffects.spawnArc(
            currentTop,
            nextPos,
            colors.secondary || "#ff4500",
            1.0,
            8,
            pillarHeight * 0.2
          );
        }
        
        // Particle streams rising from pillars
        baseEffects.spawnParticleBurst(
          new THREE.Vector3(pillarPos.x, pillarPos.y + pillarHeight, pillarPos.z),
          10,
          colors.accent || "#ffd700",
          3.0,
          0.12,
          1.5
        );
      }, i * 50);
    }
    
    // Central energy pillar
    setTimeout(() => {
      baseEffects.spawnPillar(
        center,
        pillarHeight * 1.5,
        0.8,
        colors.accent || "#ffd700",
        2.0
      );
      
      // Spiral effect around central pillar
      baseEffects.spawnSpiral(
        center,
        2.0,
        pillarHeight * 1.5,
        colors.shield || "#ff8c00",
        1.5,
        4
      );
    }, 300);
    
    // Massive particle dome effect
    setTimeout(() => {
      baseEffects.spawnParticleBurst(
        new THREE.Vector3(center.x, center.y + pillarHeight * 0.5, center.z),
        particles.count || 80,
        colors.primary || "#ff6347",
        particles.speed || 3.0,
        0.15,
        particles.lifetime || 3.0
      );
    }, 400);
    
    // Pulsing ground rings
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        baseEffects.spawnShockwave(
          center,
          domeRadius * 0.8,
          colors.accent || "#ffd700",
          0.6,
          0.3
        );
      }, i * 400);
    }
  }
}