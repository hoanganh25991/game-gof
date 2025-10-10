import * as THREE from "../vendor/three/build/three.module.js";
import { COLOR, FX } from "./constants.js";
import { now, parseThreeColor } from "./utils.js";
import { handWorldPos, leftHandWorldPos } from "./entities.js";
import { BaseEffects, normalizeColor, createGroundRing } from "./effects_base.js";
import { executeSkillEffect, hasSkillEffect, preloadEffects } from "./effects_loader.js";

// Re-export for backward compatibility
export { createGroundRing, normalizeColor };

/**
 * Unified Effects Manager
 * 
 * Combines base effects primitives with skill-specific effects registry.
 * Maintains backward compatibility with existing code while providing
 * a cleaner, more modular architecture.
 * 
 * Architecture:
 * - Base effects: Generic primitives (beam, arc, impact, ring, etc.)
 * - Skill effects: Registered effects per skill ID
 * - Legacy methods: Preserved for backward compatibility
 */
export class EffectsManager extends BaseEffects {
  constructor(scene, opts = {}) {
    const quality = (opts && opts.quality) ||
      (typeof localStorage !== "undefined"
        ? (JSON.parse(localStorage.getItem("gof.renderPrefs") || "{}").quality || "high")
        : "high");
    
    super(scene, quality);
    
    // Store options for legacy methods
    this.opts = opts;
  }

  // ===== SKILL EFFECT EXECUTION =====
  
  /**
   * Execute a skill effect by ID using the registry
   * This is the primary method for triggering skill visuals
   */
  executeSkillEffect(skillId, params) {
    executeSkillEffect(skillId, this, params);
  }

  /**
   * Check if a skill has a registered effect
   */
  hasSkillEffect(skillId) {
    return hasSkillEffect(skillId);
  }

  // ===== INDICATOR HELPERS (UI/Feedback) =====
  
  spawnMovePing(point, color = COLOR.fire) {
    const ring = createGroundRing(0.6, 0.85, color, 0.8);
    ring.position.set(point.x, 0.02, point.z);
    this.indicators.add(ring);
    this.queue.push({ obj: ring, until: now() + 0.8 * FX.timeScale, fade: true, mat: ring.material, scaleRate: 1.6 });
  }

  spawnTargetPing(entity, color = COLOR.ember) {
    if (!entity || !entity.alive) return;
    const p = entity.pos();
    const ring = createGroundRing(0.65, 0.9, color, 0.85);
    ring.position.set(p.x, 0.02, p.z);
    this.indicators.add(ring);
    this.queue.push({ obj: ring, until: now() + 0.7 * FX.timeScale, fade: true, mat: ring.material, scaleRate: 1.4 });
  }

  showNoTargetHint(player, radius) {
    const ring = createGroundRing(Math.max(0.1, radius - 0.2), radius + 0.2, COLOR.ember, 0.35);
    const p = player.pos();
    ring.position.set(p.x, 0.02, p.z);
    this.indicators.add(ring);
    this.queue.push({ obj: ring, until: now() + 0.8 * FX.timeScale, fade: true, mat: ring.material });
    this.spawnStrike(player.pos(), 1.2, COLOR.ember);
  }

  // ===== LEGACY COMPATIBILITY METHODS =====
  // These maintain backward compatibility with existing code
  
  /**
   * @deprecated Use spawnProjectile from base effects
   */
  spawnFireball(from, to, opts = {}) {
    this.spawnProjectile(from, to, {
      color: opts.color || COLOR.fire,
      size: opts.size || 0.4,
      speed: opts.speed || 20,
      trail: opts.trail !== false,
      onComplete: opts.onComplete
    });
  }

  /**
   * Fire stream with flickering flames (legacy method)
   * @deprecated Consider using spawnArc with multiple passes
   */
  spawnFireStream(from, to, color = COLOR.fire, life = 0.12, segments = 10, amplitude = 0.6) {
    const dir = this._tmpVecA.copy(to).sub(this._tmpVecB.copy(from));
    const normal = this._tmpVecC.set(-dir.z, 0, dir.x).normalize();
    const up = this._tmpVecD.set(0, 1, 0);

    const fireColors = [COLOR.yellow, COLOR.accent, COLOR.fire];
    const passes = this.quality === "low" ? 2 : (this.quality === "medium" ? 3 : 4);
    
    for (let pass = 0; pass < passes; pass++) {
      const points = [];
      const seg = Math.max(4, Math.round(segments * (this.quality === "low" ? 0.5 : (this.quality === "medium" ? 0.75 : 1))));
      const spreadMult = pass * 0.15;
      
      for (let i = 0; i <= seg; i++) {
        const t = i / segments;
        const pTmp = this._tmpVecE.copy(from).lerp(this._tmpVecB.copy(to), t);
        const amp = Math.sin(Math.PI * t) * amplitude * (0.3 + spreadMult);
        const waveOffset = Math.sin(t * Math.PI * 3 + Date.now() * 0.01 + pass * 0.5) * amplitude * (0.2 + spreadMult);
        const turbulence = (Math.random() - 0.5) * amplitude * (0.4 + spreadMult);
        const j1 = this._tmpVecA.copy(normal).multiplyScalar(waveOffset + turbulence);
        const j2 = this._tmpVecC.copy(up).multiplyScalar((Math.random() * 2 - 1) * amp * 0.6);
        pTmp.add(j1).add(j2);
        points.push(pTmp.clone());
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const colorIdx = Math.min(pass, fireColors.length - 1);
      const fireColor = fireColors[colorIdx];
      const opacity = pass === 0 ? 0.9 : (0.7 - pass * 0.15);
      const material = new THREE.LineBasicMaterial({ 
        color: normalizeColor(fireColor), 
        transparent: true, 
        opacity: opacity,
        linewidth: 2
      });
      const line = new THREE.Line(geometry, material);
      this.transient.add(line);
      const lifeMul = this.quality === "low" ? 0.7 : (this.quality === "medium" ? 0.85 : 1);
      this.queue.push({ obj: line, until: now() + life * lifeMul * FX.timeScale, fade: true, mat: material });
    }
  }

  /**
   * Auto-scaling fire stream (legacy)
   * @deprecated Use spawnArc with calculated parameters
   */
  spawnFireStreamAuto(from, to, color = COLOR.fire, life = 0.12) {
    const dir = to.clone().sub(from);
    const length = dir.length() || 1;
    const segments = Math.max(8, Math.min(18, Math.round(8 + length * 0.5)));
    const amplitude = Math.min(1.0, 0.25 + length * 0.02);
    this.spawnFireStream(from, to, color, life, segments, amplitude);
  }

  /**
   * Arc noise path (legacy)
   * @deprecated Use spawnArc directly
   */
  spawnArcNoisePath(from, to, color = COLOR.fire, life = 0.08, passes = 2) {
    for (let i = 0; i < passes; i++) {
      this.spawnArc(from, to, color, life, 6, 0.2);
    }
  }

  /**
   * Hit decal on ground (legacy)
   */
  spawnHitDecal(center, color = COLOR.ember) {
    const ring = createGroundRing(0.2, 0.55, color, 0.5);
    ring.position.set(center.x, 0.02, center.z);
    this.indicators.add(ring);
    this.queue.push({ obj: ring, until: now() + 0.22 * FX.timeScale, fade: true, mat: ring.material, scaleRate: 1.3 });
  }

  /**
   * Strike/explosion effect (legacy - wraps spawnImpact)
   */
  spawnStrike(point, radius = 2, color = COLOR.fire) {
    this.spawnImpact(point, radius, color, 1.5);
    
    // Add extra embers for legacy compatibility
    const emberCount = this.quality === "low" ? 4 : (this.quality === "medium" ? 8 : 12);
    for (let i = 0; i < emberCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.5;
      const emberStart = point.clone().add(new THREE.Vector3(
        Math.cos(ang) * r, 
        0.1, 
        Math.sin(ang) * r
      ));
      const emberEnd = emberStart.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * 1.5
      ));
      const emberColor = Math.random() > 0.6 ? COLOR.yellow : (Math.random() > 0.5 ? COLOR.accent : COLOR.ember);
      this.spawnBeam(emberStart, emberEnd, emberColor, 0.1 + Math.random() * 0.1);
    }
  }

  /**
   * Ring pulse (legacy - wraps spawnRing)
   */
  spawnRingPulse(center, radius = 6, color = COLOR.fire, duration = 0.35, width = 0.6, opacity = 0.55) {
    this.spawnRing(center, radius, color, duration, width, opacity);
  }

  /**
   * Shield bubble (legacy - wraps spawnShield)
   */
  spawnShieldBubble(entity, color = COLOR.fire, duration = 6, radius = 1.7) {
    this.spawnShield(entity, color, duration, radius);
  }

  /**
   * Storm cloud disc (legacy)
   */
  spawnStormCloud(center, radius = 12, color = COLOR.fire, duration = 6, height = 3.6) {
    try {
      const thick = Math.max(0.6, radius * 0.08);
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(Math.max(2, radius * 0.8), thick * 0.5, 12, 32),
        new THREE.MeshBasicMaterial({ color: normalizeColor(color), transparent: true, opacity: 0.18 })
      );
      torus.position.set(center.x, height, center.z);
      torus.rotation.x = Math.PI / 2;
      this.transient.add(torus);
      this.queue.push({ obj: torus, until: now() + duration * FX.timeScale, fade: true, mat: torus.material, spinRate: 0.6 });
    } catch (_) {}
  }

  // ===== HAND/PLAYER EFFECTS =====
  
  spawnHandFlash(player, left = false) {
    const p = left ? leftHandWorldPos(player) : handWorldPos(player);
    this.spawnSphere(p, 0.28, COLOR.fire, 0.12, 0.9);
  }

  spawnHandFlashColored(player, color = COLOR.fire, left = false) {
    const p = left ? leftHandWorldPos(player) : handWorldPos(player);
    this.spawnSphere(p, 0.28, color, 0.14, 0.95);
  }

  spawnHandCrackle(player, left = false, strength = 1) {
    if (!player) return;
    const origin = left ? leftHandWorldPos(player) : handWorldPos(player);
    const qMul = this.quality === "low" ? 0.4 : (this.quality === "medium" ? 0.6 : 1);
    const count = Math.max(1, Math.round((2 + Math.random() * 2 * strength) * qMul));
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.2), (Math.random() - 0.5)).normalize();
      const len = 0.35 + Math.random() * 0.5 * strength;
      const to = origin.clone().add(dir.multiplyScalar(len));
      this.spawnBeam(origin.clone(), to, COLOR.fire, 0.06);
    }
  }

  spawnHandLink(player, life = 0.08) {
    if (!player) return;
    const a = handWorldPos(player);
    const b = leftHandWorldPos(player);
    this.spawnFireStreamAuto(a, b, COLOR.fire, life);
  }

  // ===== DAMAGE POPUP =====
  
  spawnDamagePopup(worldPos, amount, color = "#ffe1e1") {
    const q = this.quality || "high";
    if (q === "low" && Math.random() > 0.3) return;
    if (q === "medium" && Math.random() > 0.6) return;
    if (!worldPos) return;
    
    const text = String(Math.floor(Number(amount) || amount));
    const w = 160;
    const h = 64;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    
    ctx.clearRect(0, 0, w, h);
    ctx.font = "bold 36px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.strokeText(text, w / 2, h / 2);
    ctx.fillStyle = `${color}`;
    ctx.fillText(text, w / 2, h / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
    const spr = new THREE.Sprite(mat);

    const scaleBase = 0.8;
    const scale = scaleBase + Math.min(2.0, text.length * 0.08);
    spr.scale.set(scale * (w / 128), scale * (h / 64), 1);
    spr.position.set(worldPos.x, worldPos.y + 2.4, worldPos.z);

    this.transient.add(spr);
    this.queue.push({
      obj: spr,
      until: now() + 1.0 * FX.popupDurationScale,
      fade: true,
      mat: mat,
      velY: 0.9,
      map: tex,
    });
  }
}

// Re-export preload helper
export { preloadEffects };