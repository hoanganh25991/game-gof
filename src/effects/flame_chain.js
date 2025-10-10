import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

/**
 * Flame Chain Effect
 * 
 * UNIQUE VISUAL: Actual chain links made of fire connecting targets,
 * with glowing connection points and sparking particles
 */
export default function flameChainEffect(baseEffects, params) {
  const { from, to, targets, chain } = params;
  const fx = SKILL_FX.flame_chain || {};
  const colors = fx.colors || {};
  
  if (chain && chain.length > 0) {
    // Draw chain connections between all targets
    for (let i = 0; i < chain.length - 1; i++) {
      const start = chain[i];
      const end = chain[i + 1];
      createFlameChainLink(baseEffects, start, end, colors);
    }
  } else if (from && to) {
    // Single chain link
    createFlameChainLink(baseEffects, from, to, colors);
  }
}

/**
 * Create a single flame chain link between two points
 */
function createFlameChainLink(baseEffects, start, end, colors) {
  const scene = baseEffects.scene;
  const group = new THREE.Group();
  scene.add(group);
  
  const dir = new THREE.Vector3().subVectors(end, start);
  const distance = dir.length();
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  
  // 1. Create chain links (cylinders connected in series)
  const linkCount = Math.max(5, Math.floor(distance / 1.5));
  const links = [];
  
  for (let i = 0; i < linkCount; i++) {
    const t = i / linkCount;
    const nextT = (i + 1) / linkCount;
    
    const linkStart = new THREE.Vector3().lerpVectors(start, end, t);
    const linkEnd = new THREE.Vector3().lerpVectors(start, end, nextT);
    const linkMid = new THREE.Vector3().addVectors(linkStart, linkEnd).multiplyScalar(0.5);
    const linkLength = linkStart.distanceTo(linkEnd);
    
    // Chain link (torus rotated to form link)
    const linkGeo = new THREE.TorusGeometry(0.15, 0.05, 8, 16);
    const linkMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.9,
      emissive: 0xff4500,
      emissiveIntensity: 0.6
    });
    const link = new THREE.Mesh(linkGeo, linkMat);
    
    // Position and orient link
    link.position.copy(linkMid);
    const linkDir = new THREE.Vector3().subVectors(linkEnd, linkStart);
    const angle = Math.atan2(linkDir.x, linkDir.z);
    link.rotation.y = -angle;
    link.rotation.x = Math.PI / 2;
    
    // Alternate rotation for chain effect
    if (i % 2 === 0) {
      link.rotation.z = Math.PI / 2;
    }
    
    group.add(link);
    links.push(link);
  }
  
  // 2. Glowing core beam connecting the chain
  const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, distance, 8);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.7,
    emissive: 0xffd700,
    emissiveIntensity: 0.8
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  
  // Position and orient beam
  beam.position.copy(midPoint);
  const beamAngle = Math.atan2(dir.x, dir.z);
  beam.rotation.y = -beamAngle;
  beam.rotation.x = Math.PI / 2;
  
  group.add(beam);
  
  // 3. Connection spheres at start and end
  const startSphereGeo = new THREE.SphereGeometry(0.3, 12, 12);
  const startSphereMat = new THREE.MeshBasicMaterial({
    color: 0xff6347,
    transparent: true,
    opacity: 0.9,
    emissive: 0xff6347,
    emissiveIntensity: 0.7
  });
  const startSphere = new THREE.Mesh(startSphereGeo, startSphereMat);
  startSphere.position.copy(start);
  group.add(startSphere);
  
  const endSphereGeo = new THREE.SphereGeometry(0.3, 12, 12);
  const endSphereMat = new THREE.MeshBasicMaterial({
    color: 0xff6347,
    transparent: true,
    opacity: 0.9,
    emissive: 0xff6347,
    emissiveIntensity: 0.7
  });
  const endSphere = new THREE.Mesh(endSphereGeo, endSphereMat);
  endSphere.position.copy(end);
  group.add(endSphere);
  
  // 4. Sparking particles along the chain
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const t = Math.random();
      const sparkPos = new THREE.Vector3().lerpVectors(start, end, t);
      
      baseEffects.queue.push({
        obj: null,
        until: Date.now() + 600,
        particle: true,
        pos: sparkPos.clone(),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ),
        gravity: 0,
        size: 0.1,
        color: 0xffd700,
        opacity: 0.9,
        fade: true
      });
    }, i * 20);
  }
  
  // 5. Impact effect at end point
  const impactGeo = new THREE.SphereGeometry(1, 16, 16);
  const impactMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 1.0
  });
  const impact = new THREE.Mesh(impactGeo, impactMat);
  impact.position.copy(end);
  scene.add(impact);
  
  // Impact shockwave
  const shockGeo = new THREE.RingGeometry(0.5, 1, 32);
  const shockMat = new THREE.MeshBasicMaterial({
    color: 0xff6347,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  const shock = new THREE.Mesh(shockGeo, shockMat);
  shock.rotation.x = -Math.PI / 2;
  shock.position.set(end.x, end.y, end.z);
  scene.add(shock);
  
  baseEffects.queue.push({
    obj: shock,
    until: Date.now() + 600,
    fade: true,
    mat: shockMat,
    shockwave: true,
    shockwaveSpeed: 5
  });
  
  // Animate and cleanup
  const startTime = Date.now();
  const duration = 800;
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    if (progress >= 1) {
      // Cleanup
      scene.remove(group);
      scene.remove(impact);
      
      links.forEach(link => {
        link.geometry.dispose();
        link.material.dispose();
      });
      beamGeo.dispose();
      beamMat.dispose();
      startSphereGeo.dispose();
      startSphereMat.dispose();
      endSphereGeo.dispose();
      endSphereMat.dispose();
      impactGeo.dispose();
      impactMat.dispose();
      
      return;
    }
    
    // Pulse chain links
    const pulse = Math.sin(elapsed * 0.01) * 0.2;
    links.forEach((link, index) => {
      const linkPulse = Math.sin(elapsed * 0.01 + index * 0.3) * 0.2;
      link.scale.setScalar(1 + linkPulse);
      link.material.opacity = 0.9 - progress * 0.3;
    });
    
    // Pulse beam
    beam.material.opacity = 0.7 * (1 - progress * 0.5);
    
    // Pulse connection spheres
    const spherePulse = Math.sin(elapsed * 0.008) * 0.3;
    startSphere.scale.setScalar(1 + spherePulse);
    endSphere.scale.setScalar(1 + spherePulse);
    startSphere.material.opacity = 0.9 - progress * 0.3;
    endSphere.material.opacity = 0.9 - progress * 0.3;
    
    // Impact flash
    impact.scale.setScalar(1 + progress * 2);
    impact.material.opacity = 1 - progress;
    
    requestAnimationFrame(animate);
  }
  
  animate();
}