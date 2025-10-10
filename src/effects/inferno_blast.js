import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Inferno Blast Effect
 * 
 * UNIQUE VISUAL: Massive mushroom cloud explosion with expanding fireball,
 * multiple shockwaves, fire pillars, and debris particles
 */
class InfernoBlastEffect {
  constructor(baseEffects, params) {
    const { center, radius } = params || {};
    const fx = SKILL_FX.inferno_blast || {};
    const colors = fx.colors || {};
    
    if (!center) return;
    
    const blastRadius = radius || 16;
    createInfernoBlast(baseEffects, center, blastRadius, colors);
  }
}

export default function infernoBlastEffect(baseEffects, params) { return new InfernoBlastEffect(baseEffects, params); }

/**
 * Create the massive inferno blast explosion
 */
function createInfernoBlast(baseEffects, center, blastRadius, colors) {
  const scene = baseEffects.scene;
  const group = new THREE.Group();
  group.position.copy(center);
  scene.add(group);
  
  // 1. Central explosion core (massive sphere)
  const coreGeo = new THREE.SphereGeometry(3, 24, 24);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffff00, // Bright yellow
    transparent: true,
    opacity: 1.0,
    emissive: 0xffff00,
    emissiveIntensity: 1.0
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 1;
  group.add(core);
  
  // 2. Fireball layer (orange)
  const fireballGeo = new THREE.SphereGeometry(5, 24, 24);
  const fireballMat = new THREE.MeshBasicMaterial({
    color: 0xff4500,
    transparent: true,
    opacity: 0.8,
    emissive: 0xff4500,
    emissiveIntensity: 0.7
  });
  const fireball = new THREE.Mesh(fireballGeo, fireballMat);
  fireball.position.y = 1;
  group.add(fireball);
  
  // 3. Outer smoke layer (dark red)
  const smokeGeo = new THREE.SphereGeometry(7, 24, 24);
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0x8b0000,
    transparent: true,
    opacity: 0.5
  });
  const smoke = new THREE.Mesh(smokeGeo, smokeMat);
  smoke.position.y = 1;
  group.add(smoke);
  
  // 4. Mushroom cloud top (hemisphere rising up)
  const mushroomGeo = new THREE.SphereGeometry(6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const mushroomMat = new THREE.MeshBasicMaterial({
    color: 0x2a2a2a, // Dark smoke
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  const mushroom = new THREE.Mesh(mushroomGeo, mushroomMat);
  mushroom.position.y = 8;
  mushroom.rotation.x = Math.PI; // Flip to face up
  group.add(mushroom);
  
  // 5. Fire pillars around blast (12 pillars)
  const pillarCount = 12;
  const pillars = [];
  
  for (let i = 0; i < pillarCount; i++) {
    const angle = (i / pillarCount) * Math.PI * 2;
    const dist = blastRadius * 0.6;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.7, 8, 12);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xff6347,
      transparent: true,
      opacity: 0.8,
      emissive: 0xff6347,
      emissiveIntensity: 0.5
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, 4, z);
    group.add(pillar);
    pillars.push(pillar);
  }
  
  // 6. Ground crater (dark circle)
  const craterGeo = new THREE.CircleGeometry(blastRadius * 0.8, 64);
  const craterMat = new THREE.MeshBasicMaterial({
    color: 0x1a1a1a,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  const crater = new THREE.Mesh(craterGeo, craterMat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.y = 0.01;
  group.add(crater);
  
  // 7. Expanding shockwave rings (4 rings)
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const ringGeo = new THREE.RingGeometry(1, 2, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0xffff00 : (i === 1 ? 0xff6347 : 0xff4500),
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(center.x, 0.1, center.z);
      scene.add(ring);
      
      baseEffects.queue.push({
        obj: ring,
        until: Date.now() + 1200,
        fade: true,
        mat: ringMat,
        shockwave: true,
        shockwaveSpeed: blastRadius * 1.5
      });
    }, i * 120);
  }
  
  // 8. Massive debris particle explosion (150 particles)
  for (let i = 0; i < 150; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 8;
    const upwardSpeed = 5 + Math.random() * 10;
    
    baseEffects.queue.push({
      obj: null,
      until: Date.now() + 2000,
      particle: true,
      pos: new THREE.Vector3(center.x, center.y + 1, center.z),
      vel: new THREE.Vector3(
        Math.cos(angle) * speed,
        upwardSpeed,
        Math.sin(angle) * speed
      ),
      gravity: -12,
      size: 0.2 + Math.random() * 0.2,
      color: i % 4 === 0 ? 0xffff00 : (i % 4 === 1 ? 0xff6347 : (i % 4 === 2 ? 0xff4500 : 0x8b0000)),
      opacity: 0.9,
      fade: true
    });
  }
  
  // 9. Secondary smoke particles (dark)
  setTimeout(() => {
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      
      baseEffects.queue.push({
        obj: null,
        until: Date.now() + 3000,
        particle: true,
        pos: new THREE.Vector3(center.x, center.y + 5, center.z),
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          3 + Math.random() * 4,
          Math.sin(angle) * speed
        ),
        gravity: -3,
        size: 0.4 + Math.random() * 0.3,
        color: 0x2a2a2a,
        opacity: 0.7,
        fade: true
      });
    }
  }, 400);
  
  // 10. Ground fire ring
  const fireRingGeo = new THREE.RingGeometry(blastRadius - 1, blastRadius + 1, 64);
  const fireRingMat = new THREE.MeshBasicMaterial({
    color: 0xff4500,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    emissive: 0xff4500,
    emissiveIntensity: 0.5
  });
  const fireRing = new THREE.Mesh(fireRingGeo, fireRingMat);
  fireRing.rotation.x = -Math.PI / 2;
  fireRing.position.y = 0.02;
  group.add(fireRing);
  
  // Animate and cleanup
  const startTime = Date.now();
  const duration = 2000;
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    if (progress >= 1) {
      // Cleanup
      scene.remove(group);
      coreGeo.dispose();
      coreMat.dispose();
      fireballGeo.dispose();
      fireballMat.dispose();
      smokeGeo.dispose();
      smokeMat.dispose();
      mushroomGeo.dispose();
      mushroomMat.dispose();
      craterGeo.dispose();
      craterMat.dispose();
      fireRingGeo.dispose();
      fireRingMat.dispose();
      group.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      return;
    }
    
    // Explosion expansion (first 40%)
    if (progress < 0.4) {
      const expandProgress = progress / 0.4;
      core.scale.setScalar(1 + expandProgress * 4);
      fireball.scale.setScalar(1 + expandProgress * 3);
      smoke.scale.setScalar(1 + expandProgress * 2.5);
    } else {
      // Fade and rise (after 40%)
      const fadeProgress = (progress - 0.4) / 0.6;
      
      // Core fades quickly
      core.material.opacity = Math.max(0, 1 - fadeProgress * 2);
      
      // Fireball fades slower
      fireball.material.opacity = Math.max(0, 0.8 - fadeProgress * 1.5);
      fireball.position.y = 1 + fadeProgress * 3;
      
      // Smoke rises and expands
      smoke.position.y = 1 + fadeProgress * 5;
      smoke.scale.setScalar(2.5 + fadeProgress * 2);
      smoke.material.opacity = Math.max(0, 0.5 - fadeProgress * 0.5);
    }
    
    // Mushroom cloud rises
    mushroom.position.y = 8 + progress * 6;
    mushroom.scale.setScalar(1 + progress * 1.5);
    mushroom.material.opacity = 0.7 * (1 - progress * 0.5);
    
    // Pillars fade
    pillars.forEach(pillar => {
      pillar.material.opacity = 0.8 * (1 - progress);
    });
    
    // Fire ring pulse
    const pulse = Math.sin(progress * Math.PI * 4) * 0.2;
    fireRing.material.opacity = (0.6 + pulse) * (1 - progress);
    
    // Crater darkens
    crater.material.opacity = 0.7 * Math.min(progress * 2, 1);
    
    requestAnimationFrame(animate);
  }
  
  animate();
}