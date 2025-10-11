import * as THREE from "../vendor/three/build/three.module.js";
import { makeNoiseTexture, createSeededRNG, seededRange } from "./utils.js";
import { WORLD, storageKey } from "../config/index.js";
import { THEME_COLORS } from "../config/theme.js";
import { createCypressTree, createOliveTree } from "./meshes.js";
import { createHouseCluster } from "./village_utils.js";

/**
 * Export environment object creation functions for chunk_manager
 */
export function createEnvironmentTree(type = "cypress") {
  if (type === "olive") {
    return createOliveTree();
  }
  return createCypressTree();
}

export function createEnvironmentRock() {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({ color: THEME_COLORS.rock, roughness: 0.9 });
  const rock = new THREE.Mesh(geo, mat);
  rock.castShadow = true;
  return rock;
}

export function createEnvironmentFlower() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.24),
    new THREE.MeshStandardMaterial({ color: THEME_COLORS.stem })
  );
  stem.position.y = 0.12;
  g.add(stem);
  const petal = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 6),
    new THREE.MeshStandardMaterial({ color: THEME_COLORS.tomato, emissive: THEME_COLORS.lava })
  );
  petal.position.y = 0.28;
  g.add(petal);
  return g;
}

/**
 * initEnvironment(scene, options)
 * - Adds a simple themed environment: scattered trees, rocks, flowers, a small village,
 *   optional water pool and toggleable rain.
 *
 * Returns an object with:
 *  - update(t, dt)  -> call each frame to animate rain / water
 *  - toggleRain(enabled)
 *
 * Implementation notes:
 * - Uses simple low-poly primitives (fast, no external assets).
 * - Uses WORLD.groundSize as placement bounds by default.
 */
export async function initEnvironment(scene, options = {}) {
  const cfg = Object.assign(
    {
      // denser defaults for a richer environment (Phase A tuned)
      treeCount: 160,
      rockCount: 80,
      flowerCount: 300,
      villageCount: 2,
      villageRadius: 12,
      enableWater: true,
      waterRadius: 22,
      enableRain: true,
      rainCount: 800,
      seed: Date.now(),
    },
    options
  );

  // Quality preset scaling for environment complexity
  try { cfg.quality = cfg.quality || (JSON.parse(localStorage.getItem(storageKey("renderPrefs")) || "{}").quality || "high"); } catch (_) { cfg.quality = cfg.quality || "high"; }
  const __q = cfg.quality;
  // Scale prop counts based on quality unless explicitly overridden by options
  if (__q === "medium") {
    cfg.treeCount = Math.floor(cfg.treeCount * 0.6);
    cfg.rockCount = Math.floor(cfg.rockCount * 0.6);
    cfg.flowerCount = Math.floor(cfg.flowerCount * 0.5);
    cfg.villageCount = Math.max(1, Math.floor(cfg.villageCount * 0.8));
    cfg.rainCount = Math.floor(cfg.rainCount * 0.6);
  } else if (__q === "low") {
    cfg.treeCount = Math.floor(cfg.treeCount * 0.35);
    cfg.rockCount = Math.floor(cfg.rockCount * 0.45);
    cfg.flowerCount = Math.floor(cfg.flowerCount * 0.35);
    cfg.villageCount = 1;
    cfg.enableWater = false;
    cfg.rainCount = Math.floor(cfg.rainCount * 0.33);
  }
  // If chunking is enabled, delegate world props/structures to chunk manager
  try {
    if (WORLD?.chunking?.enabled) {
      cfg.treeCount = 0;
      cfg.rockCount = 0;
      cfg.flowerCount = 0;
      cfg.villageCount = 0;
    }
  } catch (_) { }
  // Whether to add light sources on houses (skip on low, dim on medium)
  const __houseLights = __q === "high" ? "full" : (__q === "medium" ? "dim" : "none");
  // Dynamic light budget to cap per-frame lighting cost
  const __lightBudget = (__q === "low") ? 0 : (__q === "medium" ? 6 : 10);
  let __lightBudgetLeft = __lightBudget;
  function acquireLight(n = 1) {
    if (__lightBudgetLeft >= n) { __lightBudgetLeft -= n; return true; }
    return false;
  }

  const root = new THREE.Group();
  root.name = "environment";
  scene.add(root);
  const rng = createSeededRNG(cfg.seed);

  // atmospheric fog tuned for fire/volcanic theme
  scene.fog = scene.fog || new THREE.FogExp2(THEME_COLORS.themeDark, 0.0009);

  // Ambient & directional light to match fire / volcanic theme (complements existing lights)
  const ambient = new THREE.AmbientLight(THEME_COLORS.ambientDark, 0.68);
  root.add(ambient);

  // warm directional light to enhance fire ambiance (soft)
  const sun = new THREE.DirectionalLight(THEME_COLORS.themeOrange, 0.36);
  sun.position.set(60, 80, -40);
  sun.castShadow = false;
  root.add(sun);

  // Ground detail subtle overlay (tile noise material)
  const detailTex = makeNoiseTexture(256);
  detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping;
  detailTex.repeat.set(12, 12);

  const groundOverlay = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(40, Math.min(300, WORLD.groundSize * 0.2)), 64),
    new THREE.MeshStandardMaterial({
      map: detailTex,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  groundOverlay.rotation.x = -Math.PI / 2;
  groundOverlay.position.y = 0.01;
  root.add(groundOverlay);

  // Helpers to place items within bounds
  const half = WORLD.groundSize * 0.5 - 6;
  function randomPosInBounds() {
    return new THREE.Vector3(
      (Math.random() * 2 - 1) * half,
      0,
      (Math.random() * 2 - 1) * half
    );
  }
  function seededRandomPosInBounds() {
    return new THREE.Vector3(
      (rng() * 2 - 1) * half,
      0,
      (rng() * 2 - 1) * half
    );
  }

  // Water placeholder (declared early so update() can reference it safely)
  let water = null;

  // Scatter props via InstancedMesh batching (reduce draw calls significantly)
  // Trees: trunk + foliage instanced
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: THEME_COLORS.trunk });
  const foliageGeo = new THREE.ConeGeometry(1, 1, 8);
  const foliageMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.05, 0.7, 0.27) });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, cfg.treeCount);
  const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, cfg.treeCount);
  trunkInst.castShadow = true; trunkInst.receiveShadow = true;
  foliageInst.castShadow = true; foliageInst.receiveShadow = true;

  // Rocks
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: THEME_COLORS.rock });
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, cfg.rockCount);
  rockInst.castShadow = true; rockInst.receiveShadow = true;

  // Flowers (stems + petals)
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 1);
  const stemMat = new THREE.MeshStandardMaterial({ color: THEME_COLORS.stem });
  const petalGeo = new THREE.SphereGeometry(1, 6, 6);
  const petalMat = new THREE.MeshStandardMaterial({ color: THEME_COLORS.themeLightOrange, emissive: THEME_COLORS.lava });
  const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, cfg.flowerCount);
  const petalInst = new THREE.InstancedMesh(petalGeo, petalMat, cfg.flowerCount);

  const _m4 = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _p = new THREE.Vector3();

  // Store per-tree base transforms for lightweight sway updates
  const treeBases = new Array(cfg.treeCount);
  // Sway stride by quality (0 disables)
  const __instSwayStride = (__q === "high" ? 2 : (__q === "medium" ? 4 : 0));
  let __swayTick = 0;

  for (let i = 0; i < cfg.treeCount; i++) {
    const p = randomPosInBounds();
    const rotY = Math.random() * Math.PI * 2;
    const baseH = 1.6 + Math.random() * 1.2;
    const trunkH = baseH * 0.45;
    const foliageH = baseH * 0.9;
    const trunkXZ = 0.85 + Math.random() * 0.4;
    const foliageXZ = baseH * 0.6;

    // Trunk
    _p.set(p.x, trunkH * 0.5, p.z);
    _q.setFromEuler(new THREE.Euler(0, rotY, 0));
    _s.set(trunkXZ, trunkH, trunkXZ);
    _m4.compose(_p, _q, _s);
    trunkInst.setMatrixAt(i, _m4);

    // Foliage (lies above trunk)
    _p.set(p.x, trunkH + foliageH * 0.5, p.z);
    _q.setFromEuler(new THREE.Euler(0, rotY, 0));
    _s.set(foliageXZ, foliageH, foliageXZ);
    _m4.compose(_p, _q, _s);
    foliageInst.setMatrixAt(i, _m4);

    treeBases[i] = {
      pos: new THREE.Vector3(p.x, 0, p.z),
      rotY,
      trunkH,
      foliageH,
      trunkXZ,
      foliageXZ,
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: 0.004 + Math.random() * 0.01
    };
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  foliageInst.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < cfg.rockCount; i++) {
    const p = randomPosInBounds();
    const s = 0.7 + Math.random() * 1.2;
    const rx = Math.random() * Math.PI;
    const ry = Math.random() * Math.PI;
    const rz = Math.random() * Math.PI;
    _p.set(p.x, 0.02, p.z);
    _q.setFromEuler(new THREE.Euler(rx, ry, rz));
    _s.set(s, s, s);
    _m4.compose(_p, _q, _s);
    rockInst.setMatrixAt(i, _m4);
  }
  rockInst.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < cfg.flowerCount; i++) {
    const p = randomPosInBounds();
    // Stem ~0.24 height
    _p.set(p.x, 0.12, p.z);
    _q.set(0, 0, 0, 1);
    _s.set(1, 0.24, 1);
    _m4.compose(_p, _q, _s);
    stemInst.setMatrixAt(i, _m4);
    // Petal ~0.08 radius sphere at y ~0.28
    _p.set(p.x, 0.28, p.z);
    _q.set(0, 0, 0, 1);
    _s.set(0.08, 0.08, 0.08);
    _m4.compose(_p, _q, _s);
    petalInst.setMatrixAt(i, _m4);
  }
  stemInst.instanceMatrix.needsUpdate = true;
  petalInst.instanceMatrix.needsUpdate = true;

  root.add(trunkInst, foliageInst, rockInst, stemInst, petalInst);

  // Forest clusters merged into instanced scatter for performance (draw call reduction).

  // (removed old straight cross roads; replaced with curved, connected network below)

  // ----------------
  // Village generator (simple clustering of houses) - now uses shared utility
  function generateVillage(center = new THREE.Vector3(0, 0, 0), count = 6, radius = 8) {
    const vgroup = createHouseCluster(center, count, radius, {
      lights: __houseLights,
      decorations: true,
      scaleMin: 0.9,
      scaleMax: 0.5,
      THEME_COLORS,
      acquireLight
    });
    vgroup.name = "village";
    root.add(vgroup);
    return vgroup;
  }

  // create villages and collect their centers so structures avoid them
  const villages = [];
  const villageCenters = [];
  for (let i = 0; i < cfg.villageCount; i++) {
    const c = seededRandomPosInBounds();
    villages.push(generateVillage(c, 4 + Math.floor(Math.random() * 6), cfg.villageRadius));
    villageCenters.push(c);
  }

  if (!WORLD?.chunking?.enabled) {
    try {
      const structuresAPI = await placeStructures({
        rng,
        seededRange,
        root,
        villageCenters,
        water,
        cfg,
        __q,
        acquireLight,
        createGreekTemple,
        createVilla,
        createGreekColumn,
        createCypressTree,
        createOliveTree,
        createGreekStatue,
        createObelisk,
        pickPos: (minVillage = 12, minWater = 10, minBetween = 10, maxTries = 60) => {
          let tries = maxTries;
          while (tries-- > 0) {
            const p = seededRandomPosInBounds();
            if (p) return p;
          }
          return seededRandomPosInBounds();
        }
      });

      // Make structures available globally for minimap
      if (structuresAPI && typeof window !== 'undefined') {
        window.__structuresAPI = structuresAPI;
      }
    } catch (e) {
      console.warn("Extra structures generation failed", e);
    }
  }

  // ----------------
  // Water pool (optional)
  // ----------------
  if (cfg.enableWater) {
    const geo = new THREE.CircleGeometry(cfg.waterRadius, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: THEME_COLORS.lava,
      metalness: 0.35,
      roughness: 0.35,
      transparent: true,
      opacity: 0.9,
    });
    water = new THREE.Mesh(geo, mat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.02, -Math.max(20, WORLD.groundSize * 0.15));
    water.receiveShadow = false;
    root.add(water);
  }

  // ----------------
  // Rain particle system (toggleable)
  // ----------------
  const rain = {
    enabled: cfg.enableRain,
    points: null,
    velocities: null,
  };

  function createRain(count = cfg.rainCount) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() * 2 - 1) * half;
      const y = 10 + Math.random() * 20;
      const z = (Math.random() * 2 - 1) * half;
      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      velocities[i] = 10 + Math.random() * 10;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: THEME_COLORS.themeLightOrange, size: 0.08, transparent: true, opacity: 0.8 });
    const pts = new THREE.Points(geom, mat);
    pts.name = "rain";
    root.add(pts);
    rain.points = pts;
    rain.velocities = velocities;
  }

  if (cfg.enableRain) createRain(cfg.rainCount);

  // ----------------
  // Update loop (animate water & rain)
  // ----------------
  let __lastSwayT = 0;
  // Rain adaptivity and stride
  const __baseRainCount = cfg.rainCount;
  let __rainStride = (__q === "high" ? 1 : (__q === "medium" ? 2 : 3));
  let __rainFrame = 0;
  let __rainDownscaled = false;
  let __lastRainAdaptT = 0;

  function update(t, dt) {
    // simple water shimmer: slightly change rotation/scale or material roughness
    if (water && water.material) {
      const m = water.material;
      m.emissive = m.emissive || new THREE.Color(THEME_COLORS.darkOrange);
      m.emissiveIntensity = 0.02 + Math.sin(t * 0.8) * 0.02;
      // gentle animated offset if material map exists
      if (m.map) {
        m.map.offset.x = Math.sin(t * 0.12) * 0.0015;
        m.map.offset.y = Math.cos(t * 0.09) * 0.0015;
      }
    }

    // Instanced foliage sway: update a subset per frame based on quality
    const doSway = (__instSwayStride > 0) && ((__q === "high") || (__q === "medium" && (t - __lastSwayT) > 0.12));
    if (doSway && foliageInst && Array.isArray(treeBases)) {
      __lastSwayT = t;
      const startIdx = __swayTick % __instSwayStride;
      for (let i = startIdx; i < treeBases.length; i += __instSwayStride) {
        const b = treeBases[i]; if (!b) continue;
        const zRot = Math.sin(t + b.swayPhase) * b.swayAmp;
        // Recompose foliage matrix with extra Z rotation while preserving Y orientation
        _p.set(b.pos.x, b.trunkH + b.foliageH * 0.5, b.pos.z);
        _q.setFromEuler(new THREE.Euler(zRot, b.rotY, 0));
        _s.set(b.foliageXZ, b.foliageH, b.foliageXZ);
        _m4.compose(_p, _q, _s);
        foliageInst.setMatrixAt(i, _m4);
      }
      foliageInst.instanceMatrix.needsUpdate = true;
      __swayTick++;
    }

    if (rain.enabled && rain.points) {
      __rainFrame++;
      if ((__rainFrame % __rainStride) === 0) {
        const pos = rain.points.geometry.attributes.position.array;
        for (let i = 0; i < rain.velocities.length; i++) {
          pos[i * 3 + 1] -= rain.velocities[i] * dt;
          if (pos[i * 3 + 1] < 0.2) {
            pos[i * 3 + 0] = (Math.random() * 2 - 1) * half;
            pos[i * 3 + 1] = 12 + Math.random() * 20;
            pos[i * 3 + 2] = (Math.random() * 2 - 1) * half;
          }
        }
        rain.points.geometry.attributes.position.needsUpdate = true;
      }
      // Adapt rain density/stride based on FPS (throttled ~1.2s)
      const nowMs = performance.now();
      if (nowMs - __lastRainAdaptT > 1200) {
        __lastRainAdaptT = nowMs;
        try {
          const fps = (window.__perfMetrics && window.__perfMetrics.fps) || 60;
          if (!__rainDownscaled && fps < 35) {
            setRainCount(Math.floor(__baseRainCount * 0.6));
            __rainDownscaled = true;
            __rainStride = Math.min(3, __rainStride + 1);
          } else if (__rainDownscaled && fps > 70) {
            setRainCount(__baseRainCount);
            __rainDownscaled = false;
            __rainStride = (__q === "high" ? 1 : (__q === "medium" ? 2 : 3));
          }
        } catch (_) { }
      }
    }
  }

  function toggleRain(enabled) {
    rain.enabled = !!enabled;
    if (rain.enabled && !rain.points) createRain(cfg.rainCount);
    if (rain.points) rain.points.visible = rain.enabled;
  }

  // Adjust rain particle count live (recreate points)
  function setRainCount(count) {
    const n = Math.max(0, Math.floor(count || 0));
    cfg.rainCount = n;
    // Remove old points if any
    if (rain.points) {
      try { root.remove(rain.points); } catch (_) { }
      try { rain.points.geometry.dispose?.(); } catch (_) { }
      rain.points = null;
      rain.velocities = null;
    }
    if (rain.enabled && n > 0) {
      createRain(n);
      if (rain.points) rain.points.visible = true;
    }
  }

  // Convenience levels: 0=low, 1=medium, 2=high
  function setRainLevel(level) {
    const lvl = Math.max(0, Math.min(2, parseInt(level, 10) || 0));
    const map = [300, 900, 1800];
    setRainCount(map[lvl]);
  }

  // Expose a small API and return
  return {
    root,
    update,
    toggleRain,
    setRainCount,
    setRainLevel,
  };
}
