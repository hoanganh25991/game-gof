import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";
import { now } from "../utils.js";
import { FX } from "../constants.js";

/**
 * Meteor Storm Effect
 * 
 * UNIQUE VISUAL: Actual meteors falling from sky with realistic physics,
 * fire trails, crater impacts with shockwaves, and lingering flames
 */
export default function meteorStormEffect(baseEffects, params) {
  const { center, radius, strike, strikePos } = params;
  const fx = SKILL_FX.meteor_storm || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  if (strike && strikePos) {
    // Create actual falling meteor with physics
    const skyHeight = 20;
    const skyPos = new THREE.Vector3(
      strikePos.x + (Math.random() - 0.5) * 3,
      skyHeight,
      strikePos.z + (Math.random() - 0.5) * 3
    );
    
    // Create meteor rock (irregular shape)
    const meteorGroup = new THREE.Group();
    
    // Main meteor body (dodecahedron for rocky look)
    const meteorSize = size.meteor || 1.2;
    const meteorGeo = new THREE.DodecahedronGeometry(meteorSize, 0);
    const meteorMat = new THREE.MeshBasicMaterial({ 
      color: 0x2a1a0a, // Dark rock
      transparent: true,
      opacity: 1.0
    });
    const meteorMesh = new THREE.Mesh(meteorGeo, meteorMat);
    meteorGroup.add(meteorMesh);
    
    // Glowing fire layer around meteor
    const fireGeo = new THREE.IcosahedronGeometry(meteorSize * 1.3, 1);
    const fireMat = new THREE.MeshBasicMaterial({ 
      color: 0xff4500,
      transparent: true,
      opacity: 0.8
    });
    const fireMesh = new THREE.Mesh(fireGeo, fireMat);
    meteorGroup.add(fireMesh);
    
    // Bright core glow
    const coreGeo = new THREE.SphereGeometry(meteorSize * 0.6, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      transparent: true,
      opacity: 0.9
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    meteorGroup.add(coreMesh);
    
    meteorGroup.position.copy(skyPos);
    baseEffects.scene.add(meteorGroup);
    
    // Animate meteor falling
    const fallDuration = 0.6;
    const startTime = now();
    const fallSpeed = skyHeight / fallDuration;
    
    const animateMeteor = () => {
      const elapsed = (now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / fallDuration);
      
      if (progress < 1) {
        // Update position (accelerating fall)
        const acceleration = 1 + progress * 2; // Speed up as it falls
        meteorGroup.position.y = skyHeight - (skyHeight * progress * acceleration);
        
        // Rotate meteor for realism
        meteorGroup.rotation.x += 0.1;
        meteorGroup.rotation.y += 0.15;
        meteorGroup.rotation.z += 0.08;
        
        // Spawn fire trail particles
        if (Math.random() > 0.3) {
          const trailParticle = new THREE.Mesh(
            new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 8),
            new THREE.MeshBasicMaterial({ 
              color: Math.random() > 0.5 ? 0xff6347 : 0xffa500,
              transparent: true,
              opacity: 0.9
            })
          );
          trailParticle.position.copy(meteorGroup.position);
          trailParticle.position.x += (Math.random() - 0.5) * 0.8;
          trailParticle.position.z += (Math.random() - 0.5) * 0.8;
          baseEffects.transient.add(trailParticle);
          
          baseEffects.queue.push({
            obj: trailParticle,
            until: now() + 0.4 * FX.timeScale,
            fade: true,
            mat: trailParticle.material,
            scaleRate: -2.0
          });
        }
        
        // Spawn smoke trail
        if (Math.random() > 0.5) {
          const smoke = new THREE.Mesh(
            new THREE.SphereGeometry(0.4 + Math.random() * 0.4, 8, 8),
            new THREE.MeshBasicMaterial({ 
              color: 0x1a1a1a,
              transparent: true,
              opacity: 0.6
            })
          );
          smoke.position.copy(meteorGroup.position);
          smoke.position.y += 1;
          baseEffects.transient.add(smoke);
          
          baseEffects.queue.push({
            obj: smoke,
            until: now() + 0.8 * FX.timeScale,
            fade: true,
            mat: smoke.material,
            scaleRate: 1.5
          });
        }
        
        requestAnimationFrame(animateMeteor);
      } else {
        // Impact!
        baseEffects.scene.remove(meteorGroup);
        meteorGeo.dispose();
        meteorMat.dispose();
        fireGeo.dispose();
        fireMat.dispose();
        coreGeo.dispose();
        coreMat.dispose();
        
        // Create massive impact crater effect
        createImpactCrater(strikePos, size.crater || 2.0, colors, baseEffects);
      }
    };
    
    animateMeteor();
    
  } else if (center) {
    // Initial storm activation - warning circle
    const warningRing = new THREE.Mesh(
      new THREE.RingGeometry(radius - 1.5, radius + 1.5, 64),
      new THREE.MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      })
    );
    warningRing.rotation.x = -Math.PI / 2;
    warningRing.position.set(center.x, 0.05, center.z);
    baseEffects.indicators.add(warningRing);
    
    baseEffects.queue.push({
      obj: warningRing,
      until: now() + 1.2 * FX.timeScale,
      fade: true,
      mat: warningRing.material,
      pulseAmp: 0.15,
      pulseRate: 4.0,
      baseScale: 1
    });
    
    // Add pulsing inner circle
    setTimeout(() => {
      const innerRing = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.5 - 1, radius * 0.5 + 1, 64),
        new THREE.MeshBasicMaterial({
          color: 0xff6347,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide
        })
      );
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.set(center.x, 0.05, center.z);
      baseEffects.indicators.add(innerRing);
      
      baseEffects.queue.push({
        obj: innerRing,
        until: now() + 0.8 * FX.timeScale,
        fade: true,
        mat: innerRing.material,
        scaleRate: 1.5
      });
    }, 200);
  }
}

/**
 * Create realistic impact crater with explosion effects
 */
function createImpactCrater(position, craterSize, colors, baseEffects) {
  // Ground crater ring (scorched earth)
  const craterRing = new THREE.Mesh(
    new THREE.RingGeometry(craterSize * 0.8, craterSize * 2.5, 48),
    new THREE.MeshBasicMaterial({
      color: 0x2a1a0a, // Scorched black
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
  );
  craterRing.rotation.x = -Math.PI / 2;
  craterRing.position.set(position.x, 0.01, position.z);
  baseEffects.indicators.add(craterRing);
  
  baseEffects.queue.push({
    obj: craterRing,
    until: now() + 3.0 * FX.timeScale,
    fade: true,
    mat: craterRing.material
  });
  
  // Explosion flash (bright yellow core)
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(craterSize * 1.5, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 1.0
    })
  );
  flash.position.set(position.x, 0.5, position.z);
  baseEffects.transient.add(flash);
  
  baseEffects.queue.push({
    obj: flash,
    until: now() + 0.2 * FX.timeScale,
    fade: true,
    mat: flash.material,
    scaleRate: 8.0
  });
  
  // Multiple expanding shockwave rings
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const shockwave = new THREE.Mesh(
        new THREE.RingGeometry(0.2, 0.6, 48),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? 0xffff00 : (i === 1 ? 0xff6347 : 0xff4500),
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        })
      );
      shockwave.rotation.x = -Math.PI / 2;
      shockwave.position.set(position.x, 0.1, position.z);
      baseEffects.indicators.add(shockwave);
      
      const maxScale = craterSize * (i + 1) * 2;
      const duration = 0.6 + i * 0.1;
      const startTime = now();
      
      baseEffects.queue.push({
        obj: shockwave,
        until: startTime + duration * FX.timeScale,
        fade: true,
        mat: shockwave.material,
        shockwave: true,
        shockwaveMaxRadius: maxScale,
        shockwaveThickness: 0.6,
        shockwaveStartTime: startTime,
        shockwaveDuration: duration
      });
    }, i * 80);
  }
  
  // Debris explosion (rocks and fire)
  for (let i = 0; i < 50; i++) {
    const isRock = Math.random() > 0.5;
    const debris = new THREE.Mesh(
      isRock 
        ? new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.2, 0)
        : new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 8, 8),
      new THREE.MeshBasicMaterial({
        color: isRock ? 0x3a2a1a : (Math.random() > 0.5 ? 0xff6347 : 0xffa500),
        transparent: true,
        opacity: 0.9
      })
    );
    
    debris.position.set(position.x, position.y + 0.2, position.z);
    baseEffects.transient.add(debris);
    
    // Random velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    const upSpeed = 2 + Math.random() * 4;
    
    baseEffects.queue.push({
      obj: debris,
      until: now() + (0.8 + Math.random() * 0.8) * FX.timeScale,
      fade: true,
      mat: debris.material,
      particle: true,
      velocity: new THREE.Vector3(
        Math.cos(angle) * speed,
        upSpeed,
        Math.sin(angle) * speed
      ),
      gravity: -12,
      spinRate: Math.random() * 10 - 5
    });
  }
  
  // Fire pillars shooting up
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dist = craterSize * (0.5 + Math.random() * 0.8);
    const pillarPos = new THREE.Vector3(
      position.x + Math.cos(angle) * dist,
      position.y,
      position.z + Math.sin(angle) * dist
    );
    
    setTimeout(() => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 4 + Math.random() * 2, 12),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xff4500 : 0xff6347,
          transparent: true,
          opacity: 0.8
        })
      );
      pillar.position.set(pillarPos.x, 2, pillarPos.z);
      baseEffects.transient.add(pillar);
      
      baseEffects.queue.push({
        obj: pillar,
        until: now() + 0.5 * FX.timeScale,
        fade: true,
        mat: pillar.material,
        scaleRate: -1.5
      });
    }, i * 40);
  }
  
  // Lingering fire ring
  const fireRing = new THREE.Mesh(
    new THREE.RingGeometry(craterSize * 0.5, craterSize * 1.5, 48),
    new THREE.MeshBasicMaterial({
      color: 0x8b0000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
  );
  fireRing.rotation.x = -Math.PI / 2;
  fireRing.position.set(position.x, 0.02, position.z);
  baseEffects.indicators.add(fireRing);
  
  baseEffects.queue.push({
    obj: fireRing,
    until: now() + 2.0 * FX.timeScale,
    fade: true,
    mat: fireRing.material,
    pulseAmp: 0.1,
    pulseRate: 3.0,
    baseScale: 1
  });
}