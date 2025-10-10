import * as THREE from "../vendor/three/build/three.module.js";
import { COLOR, FX } from "./constants.js";
import { now, parseThreeColor } from "./utils.js";

/**
 * Base Effects Module
 * 
 * Provides generic, reusable visual effect primitives that are not tied to any specific skill.
 * These are the building blocks for all visual effects in the game.
 */

// Normalize color inputs from various formats ("#66ffc2", 0x66ffc2, 6750146)
export function normalizeColor(c, fallback = COLOR.fire) {
  try {
    if (typeof c === "number" && Number.isFinite(c)) return c >>> 0;
    if (typeof c === "string") {
      return parseThreeColor(c).hex >>> 0;
    }
  } catch (_) {}
  try {
    if (typeof fallback === "string") return parseThreeColor(fallback).hex >>> 0;
    if (typeof fallback === "number") return fallback >>> 0;
  } catch (_) {}
  return 0xff6b35;
}

// Standalone ring factory (used by UI modules and effects)
export function createGroundRing(innerR, outerR, color, opacity = 0.6) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(innerR, outerR, 48),
    new THREE.MeshBasicMaterial({
      color: normalizeColor(color),
      transparent: true,
      opacity,
      side: THREE.FrontSide,
      depthWrite: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  return ring;
}

/**
 * Base effect primitives - generic building blocks
 */
export class BaseEffects {
  constructor(scene, quality = "high") {
    this.scene = scene;
    this.quality = quality;
    
    this.transient = new THREE.Group();
    scene.add(this.transient);
    
    this.indicators = new THREE.Group();
    scene.add(this.indicators);
    
    // Reusable temp vectors to avoid allocations
    this._tmpVecA = new THREE.Vector3();
    this._tmpVecB = new THREE.Vector3();
    this._tmpVecC = new THREE.Vector3();
    this._tmpVecD = new THREE.Vector3();
    this._tmpVecE = new THREE.Vector3();
    
    // Internal timed queue for cleanup and animations
    this.queue = []; // items: { obj, until, fade?, mat?, scaleRate? }
  }

  /**
   * Spawn a simple beam/line between two points
   */
  spawnBeam(from, to, color = COLOR.fire, life = 0.12) {
    const p0 = this._tmpVecA.copy(from);
    const p1 = this._tmpVecB.copy(to);
    const geometry = new THREE.BufferGeometry().setFromPoints([p0, p1]);
    const material = new THREE.LineBasicMaterial({ color: normalizeColor(color), linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    this.transient.add(line);
    const lifeMul = this.quality === "low" ? 0.7 : (this.quality === "medium" ? 0.85 : 1);
    this.queue.push({ obj: line, until: now() + life * lifeMul * FX.timeScale, fade: true, mat: material });
  }

  /**
   * Spawn a wavy arc/stream between two points with turbulence
   */
  spawnArc(from, to, color = COLOR.fire, life = 0.12, segments = 10, amplitude = 0.6) {
    const dir = this._tmpVecA.copy(to).sub(this._tmpVecB.copy(from));
    const normal = this._tmpVecC.set(-dir.z, 0, dir.x).normalize();
    const up = this._tmpVecD.set(0, 1, 0);
    
    const points = [];
    const seg = Math.max(4, Math.round(segments * (this.quality === "low" ? 0.5 : (this.quality === "medium" ? 0.75 : 1))));
    
    for (let i = 0; i <= seg; i++) {
      const t = i / segments;
      const pTmp = this._tmpVecE.copy(from).lerp(this._tmpVecB.copy(to), t);
      const amp = Math.sin(Math.PI * t) * amplitude;
      const waveOffset = Math.sin(t * Math.PI * 3 + Date.now() * 0.01) * amplitude * 0.3;
      const turbulence = (Math.random() - 0.5) * amplitude * 0.4;
      const j1 = this._tmpVecA.copy(normal).multiplyScalar(waveOffset + turbulence);
      const j2 = this._tmpVecC.copy(up).multiplyScalar((Math.random() * 2 - 1) * amp * 0.6);
      pTmp.add(j1).add(j2);
      points.push(pTmp.clone());
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: normalizeColor(color), 
      transparent: true, 
      opacity: 0.8,
      linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    this.transient.add(line);
    const lifeMul = this.quality === "low" ? 0.7 : (this.quality === "medium" ? 0.85 : 1);
    this.queue.push({ obj: line, until: now() + life * lifeMul * FX.timeScale, fade: true, mat: material });
  }

  /**
   * Spawn an impact effect at a point (vertical beams + radial bursts)
   */
  spawnImpact(point, radius = 2, color = COLOR.fire, intensity = 1.0) {
    const colors = [
      COLOR.yellow,
      COLOR.accent,
      COLOR.fire,
    ];
    
    const pillarPasses = Math.max(1, Math.round((this.quality === "low" ? 2 : (this.quality === "medium" ? 3 : 4)) * intensity));
    
    // Vertical pillars
    for (let i = 0; i < pillarPasses; i++) {
      const from = point.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.3 * i, 
        0.1, 
        (Math.random() - 0.5) * 0.3 * i
      ));
      const to = point.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5 * i, 
        4 + Math.random() * 2 * intensity, 
        (Math.random() - 0.5) * 0.5 * i
      ));
      const pillarColor = colors[Math.min(i, colors.length - 1)];
      this.spawnBeam(from, to, pillarColor, 0.15);
    }
    
    // Radial bursts
    const burstCount = Math.max(1, Math.round((this.quality === "low" ? 3 : (this.quality === "medium" ? 6 : 8)) * intensity));
    for (let i = 0; i < burstCount; i++) {
      const ang = (i / burstCount) * Math.PI * 2 + Math.random() * 0.5;
      const r = radius * (0.5 + Math.random() * 0.5);
      const p2 = point.clone().add(new THREE.Vector3(
        Math.cos(ang) * r, 
        0.8 + Math.random() * 1.5, 
        Math.sin(ang) * r
      ));
      const burstColor = Math.random() > 0.5 ? COLOR.accent : color;
      this.spawnBeam(point.clone().add(new THREE.Vector3(0, 0.2, 0)), p2, burstColor, 0.12);
    }
  }

  /**
   * Spawn a ground ring that expands and fades
   */
  spawnRing(center, radius = 6, color = COLOR.fire, duration = 0.35, width = 0.6, opacity = 0.55) {
    try {
      const ring = createGroundRing(Math.max(0.05, radius - width * 0.5), radius + width * 0.5, color, opacity);
      ring.position.set(center.x, 0.02, center.z);
      this.indicators.add(ring);
      this.queue.push({ obj: ring, until: now() + duration * FX.timeScale, fade: true, mat: ring.material, scaleRate: 1.0 });
    } catch (_) {}
  }

  /**
   * Spawn a sphere at a position (for explosions, flashes, etc.)
   */
  spawnSphere(position, radius = 0.3, color = COLOR.fire, life = 0.12, opacity = 0.9) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 12),
      new THREE.MeshBasicMaterial({ color: normalizeColor(color), transparent: true, opacity })
    );
    sphere.position.copy(position);
    this.transient.add(sphere);
    this.queue.push({ obj: sphere, until: now() + life * FX.timeScale, fade: true, mat: sphere.material, scaleRate: 1.8 });
  }

  /**
   * Spawn a projectile that travels from source to target
   */
  spawnProjectile(from, to, opts = {}) {
    const color = opts.color || COLOR.fire;
    const size = opts.size || 0.4;
    const speed = opts.speed || 20;
    const trail = opts.trail !== false;
    
    const dir = this._tmpVecA.copy(to).sub(this._tmpVecB.copy(from));
    const distance = dir.length();
    const travelTime = distance / speed;
    
    // Create projectile sphere
    const projectileGeo = new THREE.SphereGeometry(size, 12, 12);
    const projectileMat = new THREE.MeshBasicMaterial({ 
      color: normalizeColor(color), 
      transparent: true, 
      opacity: 0.95 
    });
    const projectile = new THREE.Mesh(projectileGeo, projectileMat);
    projectile.position.copy(from);
    
    // Add outer glow layer
    const glowGeo = new THREE.SphereGeometry(size * 1.4, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: COLOR.accent, 
      transparent: true, 
      opacity: 0.4 
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    projectile.add(glow);
    
    this.transient.add(projectile);
    
    const startTime = now();
    this.queue.push({
      obj: projectile,
      until: startTime + travelTime * FX.timeScale,
      projectile: true,
      from: from.clone(),
      to: to.clone(),
      startTime,
      travelTime,
      mat: projectileMat,
      glowMat,
      trail,
      trailColor: color,
      onComplete: opts.onComplete
    });
  }

  /**
   * Spawn a cage of vertical bars around a point
   */
  spawnCage(center, radius = 12, color = COLOR.fire, duration = 0.6, bars = 12, height = 2.2) {
    try {
      const g = new THREE.Group();
      const mats = [];
      const h = Math.max(1.4, height);
      const yMid = h * 0.5;
      const r = Math.max(1, radius);
      const col = normalizeColor(color);
      for (let i = 0; i < Math.max(6, bars); i++) {
        const ang = (i / Math.max(6, bars)) * Math.PI * 2;
        const x = center.x + Math.cos(ang) * r;
        const z = center.z + Math.sin(ang) * r;
        const geo = new THREE.CylinderGeometry(0.06, 0.06, h, 6);
        const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, yMid, z);
        g.add(m);
        mats.push(mat);
      }
      const baseRing = createGroundRing(Math.max(0.2, r - 0.25), r + 0.25, col, 0.4);
      baseRing.position.set(center.x, 0.02, center.z);
      g.add(baseRing);
      mats.push(baseRing.material);

      this.transient.add(g);
      this.queue.push({ obj: g, until: now() + duration * FX.timeScale, fade: true, mats });
    } catch (_) {}
  }

  /**
   * Spawn a shield bubble around an entity
   */
  spawnShield(entity, color = COLOR.fire, duration = 6, radius = 1.7) {
    try {
      const mat = new THREE.MeshBasicMaterial({ 
        color: normalizeColor(color), 
        transparent: true, 
        opacity: 0.22, 
        wireframe: true 
      });
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), mat);
      const p = entity.pos();
      bubble.position.set(p.x, 1.1, p.z);
      this.transient.add(bubble);
      this.queue.push({
        obj: bubble,
        until: now() + duration * FX.timeScale,
        fade: true,
        mat,
        follow: entity,
        followYOffset: 1.1,
        pulseAmp: 0.06,
        pulseRate: 3.5,
        baseScale: 1
      });
    } catch (_) {}
  }

  /**
   * Spawn orbiting orbs around an entity
   */
  spawnOrbitingOrbs(entity, color = COLOR.fire, opts = {}) {
    try {
      const count = Math.max(1, opts.count ?? 4);
      const r = Math.max(0.4, opts.radius ?? 1.2);
      const duration = Math.max(0.2, opts.duration ?? 1.0);
      const size = Math.max(0.06, opts.size ?? 0.16);
      const rate = Math.max(0.5, opts.rate ?? 4.0);

      const group = new THREE.Group();
      const children = [];
      for (let i = 0; i < count; i++) {
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(size, 10, 10),
          new THREE.MeshBasicMaterial({ color: normalizeColor(color), transparent: true, opacity: 0.9 })
        );
        group.add(orb);
        children.push(orb);
      }
      const p = entity.pos();
      group.position.set(p.x, 0, p.z);
      this.transient.add(group);
      this.queue.push({
        obj: group,
        until: now() + duration * FX.timeScale,
        fade: true,
        follow: entity,
        followYOffset: 0,
        orbitChildren: children,
        orbitR: r,
        orbitRate: rate,
        orbitYOffset: 1.2
      });
    } catch (_) {}
  }

  /**
   * Spawn a spiral effect (for trails, tornadoes, etc.)
   */
  spawnSpiral(center, radius = 2, height = 4, color = COLOR.fire, duration = 0.8, turns = 3) {
    try {
      const points = [];
      const segments = Math.max(20, Math.round(turns * 12));
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 2 * turns;
        const r = radius * (1 - t * 0.3); // Taper toward top
        const x = center.x + Math.cos(angle) * r;
        const y = center.y + t * height;
        const z = center.z + Math.sin(angle) * r;
        points.push(new THREE.Vector3(x, y, z));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ 
        color: normalizeColor(color), 
        transparent: true, 
        opacity: 0.8,
        linewidth: 2
      });
      const spiral = new THREE.Line(geometry, material);
      this.transient.add(spiral);
      this.queue.push({ 
        obj: spiral, 
        until: now() + duration * FX.timeScale, 
        fade: true, 
        mat: material,
        spinRate: 2.0
      });
    } catch (_) {}
  }

  /**
   * Spawn a cone/fountain effect (for explosions, geysers)
   */
  spawnCone(apex, direction, angle = 30, length = 3, color = COLOR.fire, rays = 12, duration = 0.3) {
    try {
      const dir = this._tmpVecA.copy(direction).normalize();
      const angleRad = (angle * Math.PI) / 180;
      
      // Create perpendicular vectors for cone base
      const perp1 = this._tmpVecB.set(-dir.z, 0, dir.x).normalize();
      const perp2 = this._tmpVecC.crossVectors(dir, perp1).normalize();
      
      for (let i = 0; i < rays; i++) {
        const theta = (i / rays) * Math.PI * 2;
        const offset = perp1.clone().multiplyScalar(Math.cos(theta))
          .add(perp2.clone().multiplyScalar(Math.sin(theta)))
          .multiplyScalar(Math.tan(angleRad) * length);
        
        const endPoint = apex.clone()
          .add(dir.clone().multiplyScalar(length))
          .add(offset);
        
        this.spawnBeam(apex, endPoint, color, duration);
      }
    } catch (_) {}
  }

  /**
   * Spawn a shockwave ring that expands outward
   */
  spawnShockwave(center, maxRadius = 8, color = COLOR.fire, duration = 0.6, thickness = 0.3) {
    try {
      const ring = createGroundRing(0.1, thickness, color, 0.7);
      ring.position.set(center.x, 0.05, center.z);
      this.indicators.add(ring);
      
      this.queue.push({ 
        obj: ring, 
        until: now() + duration * FX.timeScale, 
        fade: true, 
        mat: ring.material,
        shockwave: true,
        shockwaveMaxRadius: maxRadius,
        shockwaveThickness: thickness,
        shockwaveStartTime: now(),
        shockwaveDuration: duration
      });
    } catch (_) {}
  }

  /**
   * Spawn particle burst (many small particles flying outward)
   */
  spawnParticleBurst(center, count = 30, color = COLOR.fire, speed = 5, size = 0.1, lifetime = 1.0) {
    try {
      for (let i = 0; i < Math.min(count, this.quality === "low" ? 15 : (this.quality === "medium" ? 25 : 50)); i++) {
        // Random direction
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5; // Upward bias
        
        const dir = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta)
        );
        
        const particle = new THREE.Mesh(
          new THREE.SphereGeometry(size, 6, 6),
          new THREE.MeshBasicMaterial({ 
            color: normalizeColor(color), 
            transparent: true, 
            opacity: 0.9 
          })
        );
        
        particle.position.copy(center);
        this.transient.add(particle);
        
        this.queue.push({
          obj: particle,
          until: now() + lifetime * FX.timeScale,
          fade: true,
          mat: particle.material,
          particle: true,
          velocity: dir.multiplyScalar(speed * (0.5 + Math.random() * 0.5)),
          gravity: -9.8
        });
      }
    } catch (_) {}
  }

  /**
   * Spawn a pillar/column effect (vertical beam with glow)
   */
  spawnPillar(position, height = 5, radius = 0.3, color = COLOR.fire, duration = 0.5) {
    try {
      const geometry = new THREE.CylinderGeometry(radius, radius * 1.5, height, 12);
      const material = new THREE.MeshBasicMaterial({ 
        color: normalizeColor(color), 
        transparent: true, 
        opacity: 0.7 
      });
      
      const pillar = new THREE.Mesh(geometry, material);
      pillar.position.set(position.x, height / 2, position.z);
      this.transient.add(pillar);
      
      // Add glow layer
      const glowGeo = new THREE.CylinderGeometry(radius * 1.5, radius * 2, height, 12);
      const glowMat = new THREE.MeshBasicMaterial({ 
        color: COLOR.accent, 
        transparent: true, 
        opacity: 0.3 
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      pillar.add(glow);
      
      this.queue.push({ 
        obj: pillar, 
        until: now() + duration * FX.timeScale, 
        fade: true, 
        mat: material,
        mats: [material, glowMat],
        scaleRate: 0.5
      });
    } catch (_) {}
  }

  /**
   * Spawn a lightning bolt effect (jagged line)
   */
  spawnLightning(from, to, color = COLOR.accent, branches = 2, duration = 0.1) {
    try {
      const points = [from.clone()];
      const dir = this._tmpVecA.copy(to).sub(from);
      const dist = dir.length();
      const segments = Math.max(5, Math.floor(dist / 2));
      
      // Create jagged path
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const point = from.clone().add(dir.clone().multiplyScalar(t));
        
        // Add random offset perpendicular to direction
        const offset = dist * 0.15 * (Math.random() - 0.5);
        point.x += offset * (Math.random() - 0.5);
        point.y += offset * (Math.random() - 0.5) * 0.5;
        point.z += offset * (Math.random() - 0.5);
        
        points.push(point);
      }
      points.push(to.clone());
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ 
        color: normalizeColor(color), 
        transparent: true, 
        opacity: 1.0,
        linewidth: 3
      });
      const lightning = new THREE.Line(geometry, material);
      this.transient.add(lightning);
      
      this.queue.push({ 
        obj: lightning, 
        until: now() + duration * FX.timeScale, 
        fade: true, 
        mat: material
      });
      
      // Add branches
      if (branches > 0 && points.length > 2) {
        for (let b = 0; b < branches; b++) {
          const branchIdx = Math.floor(Math.random() * (points.length - 2)) + 1;
          const branchStart = points[branchIdx];
          const branchDir = new THREE.Vector3(
            (Math.random() - 0.5) * dist * 0.3,
            (Math.random() - 0.5) * dist * 0.2,
            (Math.random() - 0.5) * dist * 0.3
          );
          const branchEnd = branchStart.clone().add(branchDir);
          this.spawnLightning(branchStart, branchEnd, color, 0, duration * 0.8);
        }
      }
    } catch (_) {}
  }

  /**
   * Update all active effects
   */
  update(t, dt) {
    // Adaptive VFX throttling based on FPS
    let fps = 60;
    try { 
      fps = (window.__perfMetrics && window.__perfMetrics.fps) 
        ? window.__perfMetrics.fps 
        : (1000 / Math.max(0.001, (window.__perfMetrics && window.__perfMetrics.avgMs) || 16.7)); 
    } catch (_) {}
    
    const __fadeBoost = fps < 20 ? 2.4 : (fps < 28 ? 1.8 : (fps < 40 ? 1.25 : 1));
    
    try {
      const maxAllowed = fps < 20 ? 28 : (fps < 28 ? 42 : (fps < 40 ? 80 : 120));
      if (this.queue.length > maxAllowed) {
        const toCull = Math.min(this.queue.length - maxAllowed, Math.floor(this.queue.length * 0.2));
        for (let k = 0; k < toCull; k++) {
          const idx = (k % this.queue.length);
          const e = this.queue[idx];
          if (e) e.until = Math.min(e.until || (t + 0.3), t + 0.12);
        }
      }
    } catch (_) {}

    for (let i = this.queue.length - 1; i >= 0; i--) {
      const e = this.queue[i];

      // Projectile motion
      if (e.projectile && e.obj && e.obj.position) {
        const elapsed = t - e.startTime;
        const progress = Math.min(1, elapsed / e.travelTime);
        
        const newPos = this._tmpVecA.copy(e.from).lerp(this._tmpVecB.copy(e.to), progress);
        e.obj.position.copy(newPos);
        
        const wobble = Math.sin(t * 15) * 0.1;
        e.obj.position.y += wobble;
        
        if (e.trail && this.quality !== "low" && Math.random() > 0.6) {
          const trailPos = e.obj.position.clone();
          const trailEnd = trailPos.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            -0.2 - Math.random() * 0.3,
            (Math.random() - 0.5) * 0.3
          ));
          this.spawnBeam(trailPos, trailEnd, e.trailColor || COLOR.fire, 0.08);
        }
        
        if (progress >= 1 && e.onComplete) {
          try { e.onComplete(e.to); } catch (_) {}
        }
      }

      // Vertical motion for popups
      if (e.velY && e.obj && e.obj.position) {
        e.obj.position.y += e.velY * dt;
      }

      // Particle physics (velocity + gravity)
      if (e.particle && e.velocity && e.obj && e.obj.position) {
        e.obj.position.x += e.velocity.x * dt;
        e.obj.position.y += e.velocity.y * dt;
        e.obj.position.z += e.velocity.z * dt;
        
        if (e.gravity) {
          e.velocity.y += e.gravity * dt;
        }
      }

      // Shockwave expansion
      if (e.shockwave && e.obj && e.obj.scale) {
        const elapsed = t - e.shockwaveStartTime;
        const progress = Math.min(1, elapsed / e.shockwaveDuration);
        const currentRadius = progress * e.shockwaveMaxRadius;
        const scale = currentRadius / e.shockwaveThickness;
        e.obj.scale.set(scale, 1, scale);
      }

      // Animated scaling
      if (e.scaleRate && e.obj && e.obj.scale) {
        const s = 1 + (e.scaleRate || 0) * dt * FX.scaleRateScale;
        e.obj.scale.multiplyScalar(s);
      }

      // Follow an entity
      if (e.follow && e.obj && typeof e.follow.pos === "function") {
        const p = e.follow.pos();
        try { e.obj.position.set(p.x, (e.followYOffset ?? e.obj.position.y), p.z); } catch (_) {}
      }

      // Pulsing scale
      if (e.pulseAmp && e.obj && e.obj.scale) {
        const base = e.baseScale || 1;
        const rate = (e.pulseRate || 3) * FX.pulseRateScale;
        const amp = e.pulseAmp || 0.05;
        const s2 = base * (1 + Math.sin(t * rate) * amp);
        try { e.obj.scale.set(s2, s2, s2); } catch (_) {}
      }

      // Spin rotation
      if (e.spinRate && e.obj && e.obj.rotation) {
        try { e.obj.rotation.y += (e.spinRate || 0) * dt * FX.spinRateScale; } catch (_) {}
      }

      // Orbiting orbs
      if (e.orbitChildren && e.obj) {
        const cnt = e.orbitChildren.length || 0;
        e.orbitBase = (e.orbitBase || 0) + (e.orbitRate || 4) * dt * FX.orbitRateScale;
        const base = e.orbitBase || 0;
        const r = e.orbitR || 1.2;
        const y = e.orbitYOffset ?? 1.2;
        for (let i = 0; i < cnt; i++) {
          const child = e.orbitChildren[i];
          if (!child) continue;
          const ang = base + (i * Math.PI * 2) / Math.max(1, cnt);
          try { child.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r); } catch (_) {}
        }
      }

      // Fade out
      if (e.fade) {
        const fadeOne = (m) => {
          if (!m) return;
          m.opacity = m.opacity ?? 1;
          m.transparent = true;
          m.opacity = Math.max(0, m.opacity - dt * 1.8 * FX.fadeSpeedScale * __fadeBoost);
        };
        if (e.mat) fadeOne(e.mat);
        if (e.mats && Array.isArray(e.mats)) e.mats.forEach(fadeOne);
      }

      // Cleanup expired effects
      if (t >= e.until) {
        this.transient.remove(e.obj);
        this.indicators.remove(e.obj);
        
        const disposeMat = (m) => {
          try { if (m && m.map) m.map.dispose?.(); } catch (_) {}
          try { m && m.dispose?.(); } catch (_) {}
        };
        const disposeObj = (o) => {
          try { o.geometry && o.geometry.dispose?.(); } catch (_) {}
          try {
            if (Array.isArray(o.material)) o.material.forEach(disposeMat);
            else disposeMat(o.material);
          } catch (_) {}
        };
        try {
          if (e.obj && typeof e.obj.traverse === "function") {
            e.obj.traverse(disposeObj);
          } else {
            disposeObj(e.obj);
          }
        } catch (_) {}
        this.queue.splice(i, 1);
      }
    }
  }
}