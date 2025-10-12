/**
 * Optimized Mesh System with LOD (Level of Detail)
 * Reduces mesh complexity based on device tier to improve performance
 */

import * as THREE from "../vendor/three/build/three.module.js";
import { THEME_COLORS } from "../config/index.js";
import { HERO_MODEL_URL } from "../config/index.js";
import { parseThreeColor } from "./utils.js";
import { getCurrentTierOptimizations, DEVICE_TIERS } from "./device-tier.js";

/**
 * Get optimized segment counts based on device tier
 */
let _loggedOptimizations = false;
function getOptimizedSegments(baseSegments, baseRings) {
  const opts = getCurrentTierOptimizations();
  const multiplier = opts.segmentMultiplier || 1.0;
  
  // Log once for debugging
  if (!_loggedOptimizations) {
    console.info('[Meshes] Using segment multiplier:', multiplier, 'Material:', opts.useMeshStandard ? 'Standard' : 'Lambert');
    _loggedOptimizations = true;
  }
  
  // Prevent invalid geometries - minimum 3 for cylinders/spheres
  // But allow lower minimums for simple shapes
  const minSegments = baseSegments <= 8 ? 3 : 4;
  const minRings = baseRings <= 8 ? 2 : 3;
  
  return {
    segments: Math.max(minSegments, Math.round(baseSegments * multiplier)),
    rings: Math.max(minRings, Math.round(baseRings * multiplier))
  };
}

/**
 * Get optimized detail level for IcosahedronGeometry
 * Detail level: 0 (low poly) to higher (more triangles)
 */
function getOptimizedDetail(baseDetail) {
  const opts = getCurrentTierOptimizations();
  const multiplier = opts.segmentMultiplier || 1.0;
  
  // For IcosahedronGeometry, reduce detail level for lower-end devices
  const detail = Math.floor(baseDetail * multiplier);
  return Math.max(0, Math.min(10, detail)); // Clamp to valid range 0-10
}

/**
 * Create material based on device tier complexity
 */
function createOptimizedMaterial(options = {}) {
  const opts = getCurrentTierOptimizations();
  const { color, emissive, metalness = 0.2, roughness = 0.5, ...rest } = options;
  
  // Use simpler Lambert material for medium/low devices
  if (!opts.useMeshStandard) {
    return new THREE.MeshLambertMaterial({
      color,
      emissive: emissive || 0x000000,
      ...rest
    });
  }
  
  // Use MeshStandardMaterial for high-end devices
  return new THREE.MeshStandardMaterial({
    color,
    emissive: emissive || 0x000000,
    metalness,
    roughness,
    ...rest
  });
}

/**
 * Optimized Hero Mesh with LOD support
 */
export class HeroMesh extends THREE.Group {
  constructor() {
    super();
    this._build();
    this.position.set(10, 1.1, 10);
  }

  _build() {
    const seg = getOptimizedSegments(14, 6);
    
    // Torso - reduced from (6, 14) to device-appropriate
    const torsoGeo = new THREE.CapsuleGeometry(0.75, 1.25, seg.rings, seg.segments);
    const torsoMat = createOptimizedMaterial({
      color: THEME_COLORS.themeLightOrange,
      emissive: THEME_COLORS.heroBodyEmissive,
      metalness: 0.2,
      roughness: 0.55,
    });
    this.body = new THREE.Mesh(torsoGeo, torsoMat);
    this.body.castShadow = true;

    // Head - reduced segments
    const headSeg = getOptimizedSegments(20, 20);
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, headSeg.segments, headSeg.rings),
      createOptimizedMaterial({ 
        color: THEME_COLORS.heroSkin, 
        emissive: THEME_COLORS.heroSkinEmissive, 
        roughness: 0.45 
      })
    );
    this.head.position.y = 1.75;
    this.body.add(this.head);

    // Beard - reduced from 16 to device-appropriate
    const beardSeg = getOptimizedSegments(16, 16);
    this.beard = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.7, beardSeg.segments),
      createOptimizedMaterial({ 
        color: THEME_COLORS.heroBeard, 
        emissive: THEME_COLORS.heroBeardEmissive, 
        roughness: 0.4 
      })
    );
    this.beard.position.set(0, 1.35, 0.28);
    this.beard.rotation.x = Math.PI * 0.05;
    this.body.add(this.beard);

    // Crown - reduced from (10, 28)
    const crownSeg = getOptimizedSegments(28, 10);
    this.crown = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.06, crownSeg.rings, crownSeg.segments),
      createOptimizedMaterial({ 
        color: THEME_COLORS.heroCrown, 
        emissive: THEME_COLORS.themeAccent, 
        metalness: 0.4, 
        roughness: 0.3 
      })
    );
    this.crown.position.y = 1.78;
    this.crown.rotation.x = Math.PI / 2;
    this.body.add(this.crown);

    // Shoulders - reduced from 16
    const shoulderSeg = getOptimizedSegments(16, 16);
    const shoulderMat = createOptimizedMaterial({ 
      color: THEME_COLORS.darkOrange, 
      emissive: THEME_COLORS.heroShoulderEmissive, 
      metalness: 0.35, 
      roughness: 0.45 
    });
    this.shoulderL = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, shoulderSeg.segments, shoulderSeg.rings), 
      shoulderMat
    );
    this.shoulderL.position.set(-0.7, 1.45, 0.1);
    this.shoulderR = this.shoulderL.clone();
    this.shoulderR.position.x = 0.7;
    this.body.add(this.shoulderL, this.shoulderR);

    // Cloak - reduced segments
    const cloakSeg = getOptimizedSegments(1, 3);
    this.cloak = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.4, cloakSeg.segments, cloakSeg.rings),
      createOptimizedMaterial({ 
        color: THEME_COLORS.heroCloak, 
        emissive: THEME_COLORS.heroCloakEmissive, 
        side: THREE.DoubleSide, 
        roughness: 0.8 
      })
    );
    this.cloak.position.set(0, 1.2, -0.45);
    this.cloak.rotation.x = Math.PI;
    this.body.add(this.cloak);

    // Arms - reduced from (6, 10)
    const armSeg = getOptimizedSegments(10, 6);
    const armMat = createOptimizedMaterial({ 
      color: THEME_COLORS.themeLightOrange, 
      emissive: THEME_COLORS.heroBodyEmissive, 
      roughness: 0.55 
    });
    
    this.rightArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.14, 0.6, armSeg.rings, armSeg.segments),
      armMat
    );
    this.rightArm.position.set(0.65, 1.3, 0.15);
    this.rightArm.rotation.z = -Math.PI * 0.25;
    this.add(this.rightArm);

    // Hand anchors
    this.handAnchor = new THREE.Object3D();
    this.handAnchor.position.set(0.85, 1.15, 0.25);
    this.add(this.handAnchor);

    this.leftHandAnchor = new THREE.Object3D();
    this.leftHandAnchor.position.set(-0.85, 1.15, 0.25);
    this.add(this.leftHandAnchor);

    // Fire orbs - use optimized detail level
    // Base detail of 2 for high-end, reduced for medium/low
    const orbDetail = getOptimizedDetail(2);
    const orbGeo = new THREE.IcosahedronGeometry(0.2, orbDetail);
    
    this.leftFireOrb = new THREE.Mesh(
      orbGeo,
      createOptimizedMaterial({ 
        color: THEME_COLORS.themeOrange, 
        emissive: THEME_COLORS.themeAccent, 
        emissiveIntensity: 2.0, 
        roughness: 0.15, 
        metalness: 0.1 
      })
    );
    this.leftHandAnchor.add(this.leftFireOrb);
    this.leftHandLight = new THREE.PointLight(THEME_COLORS.heroHandLight, 1.0, 18, 2);
    this.leftHandAnchor.add(this.leftHandLight);

    this.fireOrb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2, orbDetail),
      createOptimizedMaterial({ 
        color: THEME_COLORS.themeOrange, 
        emissive: THEME_COLORS.themeAccent, 
        emissiveIntensity: 2.2, 
        roughness: 0.15, 
        metalness: 0.1 
      })
    );
    this.handAnchor.add(this.fireOrb);
    this.handLight = new THREE.PointLight(THEME_COLORS.heroHandLight, 1.3, 20, 2);
    this.handAnchor.add(this.handLight);

    // Left arm
    this.leftArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.14, 0.6, armSeg.rings, armSeg.segments),
      armMat
    );
    this.leftArm.position.set(-0.65, 1.3, 0.15);
    this.leftArm.rotation.z = Math.PI * 0.25;
    this.add(this.leftArm);

    // Biceps - reduced segments
    const bicepSeg = getOptimizedSegments(14, 14);
    const bicepMat = createOptimizedMaterial({ 
      color: THEME_COLORS.themeLightOrange, 
      emissive: THEME_COLORS.heroBodyEmissive, 
      roughness: 0.55 
    });
    this.bicepR = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, bicepSeg.segments, bicepSeg.rings),
      bicepMat
    );
    this.bicepR.position.set(0.55, 1.45, 0.12);
    this.bicepL = this.bicepR.clone();
    this.bicepL.position.x = -0.55;
    this.add(this.bicepR, this.bicepL);

    // Tunic - reduced from 28
    const tunicSeg = getOptimizedSegments(28, 1);
    this.tunic = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.9, 1.0, tunicSeg.segments, tunicSeg.rings, true),
      createOptimizedMaterial({ 
        color: THEME_COLORS.themeLightOrange, 
        emissive: THEME_COLORS.heroCloak, 
        metalness: 0.2, 
        roughness: 0.7, 
        side: THREE.DoubleSide 
      })
    );
    this.tunic.position.set(0, 0.6, 0);
    this.body.add(this.tunic);

    // Belt - reduced from (12, 32)
    const beltSeg = getOptimizedSegments(32, 12);
    this.belt = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.06, beltSeg.rings, beltSeg.segments),
      createOptimizedMaterial({ 
        color: THEME_COLORS.heroBelt, 
        emissive: THEME_COLORS.themeAccent, 
        metalness: 0.5, 
        roughness: 0.2 
      })
    );
    this.belt.position.y = 1.0;
    this.body.add(this.belt);

    // Hair cap - reduced segments
    const hairSeg = getOptimizedSegments(20, 20);
    this.hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.56, hairSeg.segments, hairSeg.rings, 0, Math.PI * 2, 0, Math.PI / 2),
      createOptimizedMaterial({ 
        color: THEME_COLORS.heroHair, 
        emissive: THEME_COLORS.heroHairEmissive, 
        roughness: 0.65 
      })
    );
    this.hairCap.position.set(0, 0.18, 0);
    this.head.add(this.hairCap);

    // Ponytail - reduced from 12
    const ponySeg = getOptimizedSegments(12, 12);
    this.pony = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.35, ponySeg.segments),
      createOptimizedMaterial({ 
        color: THEME_COLORS.heroHair, 
        emissive: THEME_COLORS.heroHairEmissive 
      })
    );
    this.pony.position.set(0, -0.2, -0.25);
    this.pony.rotation.x = Math.PI * 0.9;
    this.head.add(this.pony);

    // Parts to hide in first-person
    this.fpHideParts = [
      this.body, this.head, this.cloak, this.tunic, this.belt,
      this.shoulderL, this.shoulderR, this.bicepR, this.bicepL,
      this.beard, this.crown, this.hairCap, this.pony
    ];

    this.add(this.body);

    // Load GLTF if available
    if (HERO_MODEL_URL) {
      this._loadGLTFModel();
    }
  }

  async _loadGLTFModel() {
    const { GLTFLoader } = await import("../vendor/three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader();
    loader.load(
      HERO_MODEL_URL,
      (gltf) => {
        const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (model) {
          model.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const targetHeight = 2.2;
          const s = size.y > 0 ? targetHeight / size.y : 1;
          model.scale.setScalar(s);
          model.position.set(0, 0, 0);
          this.add(model);
          this.body.visible = false;
        }
      },
      undefined,
      (err) => console.warn("Failed to load HERO_MODEL_URL:", HERO_MODEL_URL, err)
    );
  }
}

/**
 * Optimized Enemy Mesh with reduced complexity
 */
export class EnemyMesh extends THREE.Mesh {
  constructor(options = {}) {
    const color = options.color !== undefined ? options.color : THEME_COLORS.enemyDark;
    const eyeEmissive = options.eyeEmissive !== undefined ? options.eyeEmissive : THEME_COLORS.enemyEyeEmissive;

    // Reduced from (4, 10)
    const seg = getOptimizedSegments(10, 4);
    const geo = new THREE.CapsuleGeometry(0.6, 0.8, seg.rings, seg.segments);
    const mat = createOptimizedMaterial({ 
      color: color, 
      emissive: THEME_COLORS.enemyBodyEmissive, 
      roughness: 0.7 
    });
    
    super(geo, mat);
    this.castShadow = true;

    // Eye - reduced from (12, 12)
    const eyeSeg = getOptimizedSegments(12, 12);
    this.eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, eyeSeg.segments, eyeSeg.rings),
      createOptimizedMaterial({ 
        color: THEME_COLORS.enemyEye, 
        emissive: eyeEmissive 
      })
    );
    this.eye.position.set(0, 1.2, 0.45);
    this.add(this.eye);
  }
}

/**
 * Optimized Billboard HP Bar
 */
export class BillboardHPBar extends THREE.Group {
  constructor() {
    super();
    this.position.set(0, 2.2, 0);

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.14),
      new THREE.MeshBasicMaterial({ color: THEME_COLORS.hpBarBg, transparent: true, opacity: 0.6 })
    );
    this.add(bg);

    this.fill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.36, 0.1),
      new THREE.MeshBasicMaterial({ color: THEME_COLORS.hpBarFill })
    );
    this.fill.position.z = 0.001;
    this.add(this.fill);
  }
}

/**
 * Optimized Portal Mesh
 */
export class PortalMesh extends THREE.Group {
  constructor(color = THEME_COLORS.portal) {
    super();
    const { hex, alpha } = parseThreeColor(color);

    // Reduced from (16, 40)
    const ringSeg = getOptimizedSegments(40, 16);
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.15, ringSeg.rings, ringSeg.segments),
      createOptimizedMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 1.1,
        metalness: 0.35,
        roughness: 0.25,
        transparent: alpha < 1,
        opacity: alpha
      })
    );

    // Reduced from 48
    const swirlSeg = getOptimizedSegments(48, 48);
    this.swirl = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, swirlSeg.segments),
      new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.35 * alpha,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.swirl.position.z = 0.02;

    this.glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.25, swirlSeg.segments),
      new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.18 * alpha,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.glow.position.z = -0.02;

    // Reduced from 24
    const baseSeg = getOptimizedSegments(24, 24);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 0.2, baseSeg.segments),
      createOptimizedMaterial({ color: THEME_COLORS.portalBase, metalness: 0.3, roughness: 0.6 })
    );
    base.position.y = -1.1;

    this.add(this.ring, this.glow, this.swirl, base);

    const light = new THREE.PointLight(hex, 0.9, 12, 2);
    light.position.set(0, 0.4, 0);
    this.add(light);
  }
}

/**
 * Optimized House
 */
export class House extends THREE.Group {
  constructor() {
    super();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(6, 3, 6),
      createOptimizedMaterial({ color: THEME_COLORS.houseBase })
    );
    base.position.y = 1.5;
    this.add(base);

    // Reduced from 4 sides
    const roofSeg = getOptimizedSegments(4, 4);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, 2.5, roofSeg.segments),
      createOptimizedMaterial({ color: THEME_COLORS.heroCloak })
    );
    roof.position.y = 4.1;
    roof.rotation.y = Math.PI / 4;
    this.add(roof);
  }
}

/**
 * Optimized Hero Overhead Bars
 */
export class HeroOverheadBars extends THREE.Group {
  constructor() {
    super();
    this.position.set(0, 2.6, 0);

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.26),
      new THREE.MeshBasicMaterial({ color: THEME_COLORS.overheadBarBg, transparent: true, opacity: 0.5 })
    );
    this.add(bg);

    this.hpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.74, 0.1),
      new THREE.MeshBasicMaterial({ color: THEME_COLORS.hp })
    );
    this.hpFill.position.set(0, 0.06, 0.001);
    this.add(this.hpFill);

    this.mpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.74, 0.1),
      new THREE.MeshBasicMaterial({ color: THEME_COLORS.mp })
    );
    this.mpFill.position.set(0, -0.06, 0.001);
    this.add(this.mpFill);
  }
}

// Greek structures with optimized geometry

export class GreekColumn extends THREE.Group {
  constructor(options = {}) {
    super();

    const {
      height = 5,
      radius = 0.28,
      color = THEME_COLORS.sandstone,
      roughness = 0.55,
      metalness = 0.04,
    } = options;

    const mat = createOptimizedMaterial({ color, roughness, metalness });

    const plinthH = Math.max(0.14, height * 0.03);
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 2.2, plinthH, radius * 2.2),
      mat
    );
    plinth.position.y = plinthH / 2;
    this.add(plinth);

    // Reduced from 20
    const shaftSeg = getOptimizedSegments(20, 1);
    const shaftH = height * 0.8;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.9, radius * 0.98, shaftH, shaftSeg.segments, shaftSeg.rings),
      mat
    );
    shaft.position.y = plinthH + shaftH / 2;
    this.add(shaft);

    // Reduced capitals
    const capSeg = getOptimizedSegments(18, 1);
    const capH = Math.max(0.12, height * 0.06);
    const echinus = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.15, radius * 1.1, capH * 0.55, capSeg.segments, capSeg.rings),
      mat
    );
    echinus.position.y = plinthH + shaftH + (capH * 0.275);
    this.add(echinus);

    const abacus = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 2.0, capH * 0.5, radius * 2.0),
      mat
    );
    abacus.position.y = plinthH + shaftH + capH * 0.8;
    this.add(abacus);
  }
}

export class GreekTemple extends THREE.Group {
  constructor(options = {}) {
    super();

    const {
      cols = 6,
      rows = 10,
      colSpacingX = 2.4,
      colSpacingZ = 2.6,
      columnHeight = 5.6,
      baseMargin = 0.9,
      color = THEME_COLORS.sandstone,
    } = options;

    const mat = createOptimizedMaterial({ color });
    const width = (cols - 1) * colSpacingX;
    const depth = (rows - 1) * colSpacingZ;

    const baseH = 0.5;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(width + baseMargin * 2.2, baseH, depth + baseMargin * 2.2),
      mat
    );
    base.position.y = baseH / 2;
    this.add(base);

    const addCol = (x, z) => {
      const c = new GreekColumn({ height: columnHeight, radius: 0.3 });
      c.position.set(x, baseH, z);
      this.add(c);
    };

    const x0 = -width / 2;
    const z0 = -depth / 2;

    for (let i = 0; i < cols; i++) {
      const x = x0 + i * colSpacingX;
      addCol(x, z0);
      addCol(x, z0 + depth);
    }
    for (let j = 1; j < rows - 1; j++) {
      const z = z0 + j * colSpacingZ;
      addCol(x0, z);
      addCol(x0 + width, z);
    }

    const beamH = 0.35;
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(width + baseMargin * 1.6, beamH, depth + baseMargin * 1.6),
      mat
    );
    beam.position.y = baseH + columnHeight + beamH / 2;
    this.add(beam);

    const roofH = 0.28;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + baseMargin * 2.0, roofH, depth + baseMargin * 2.0),
      mat
    );
    roof.position.y = beam.position.y + beamH / 2 + roofH / 2;
    this.add(roof);

    const steps = new THREE.Mesh(
      new THREE.BoxGeometry((width + baseMargin * 2.2) * 0.7, baseH * 0.4, baseMargin * 1.2),
      mat
    );
    steps.position.set(0, baseH * 0.2, z0 - baseMargin * 0.6);
    this.add(steps);
  }
}

export class Villa extends THREE.Group {
  constructor(options = {}) {
    super();

    const {
      width = 12,
      depth = 8,
      height = 4,
      colorBase = THEME_COLORS.villaBase,
      colorRoof = THEME_COLORS.heroCloak,
    } = options;

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      createOptimizedMaterial({ color: colorBase })
    );
    base.position.y = height / 2;
    this.add(base);

    // Reduced from 4 sides
    const roofSeg = getOptimizedSegments(4, 4);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(width, depth) * 0.6, height * 0.9, roofSeg.segments),
      createOptimizedMaterial({ color: colorRoof })
    );
    roof.position.y = height + (height * 0.45);
    roof.rotation.y = Math.PI / 4;
    this.add(roof);

    const porchDepth = Math.min(3.2, depth * 0.45);
    const porch = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.6, 0.3, porchDepth),
      createOptimizedMaterial({ color: colorBase, roughness: 0.8 })
    );
    porch.position.set(0, 0.2, depth / 2 + porchDepth * 0.5 - 0.15);
    this.add(porch);

    const colOffX = width * 0.22;
    const colZ = depth / 2 + porchDepth * 0.25;
    const c1 = new GreekColumn({ height: height * 0.85, radius: 0.18, color: THEME_COLORS.villaPorchColumn });
    c1.position.set(-colOffX, 0.3, colZ);
    const c2 = c1.clone();
    c2.position.x = colOffX;
    this.add(c1, c2);
  }
}

export class CypressTree extends THREE.Group {
  constructor() {
    super();

    const trunkH = 1.6 + Math.random() * 0.8;
    const trunkSeg = getOptimizedSegments(6, 6);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, trunkH, trunkSeg.segments),
      createOptimizedMaterial({ color: THEME_COLORS.trunk })
    );
    trunk.position.y = trunkH / 2;
    this.add(trunk);

    const levels = 3 + Math.floor(Math.random() * 2);
    const coneSeg = getOptimizedSegments(8, 8);
    for (let i = 0; i < levels; i++) {
      const h = 1.0 + (levels - i) * 0.5;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.4 + (levels - i) * 0.18, h, coneSeg.segments),
        createOptimizedMaterial({ color: THEME_COLORS.cypressFoliage })
      );
      cone.position.y = trunkH + (i * h * 0.55);
      this.add(cone);
    }
  }
}

export class OliveTree extends THREE.Group {
  constructor() {
    super();

    const trunkH = 1.3 + Math.random() * 0.7;
    const trunkSeg = getOptimizedSegments(8, 8);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, trunkH, trunkSeg.segments),
      createOptimizedMaterial({ color: THEME_COLORS.stem })
    );
    trunk.position.y = trunkH / 2;
    this.add(trunk);

    const canopyMat = createOptimizedMaterial({ color: THEME_COLORS.oliveCanopy });
    const canopySeg = getOptimizedSegments(12, 12);
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.8, canopySeg.segments, canopySeg.rings), canopyMat);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, canopySeg.segments, canopySeg.rings), canopyMat);
    const s3 = new THREE.Mesh(new THREE.SphereGeometry(0.55, canopySeg.segments, canopySeg.rings), canopyMat);
    s1.position.set(0.0, trunkH + 0.2, 0.0);
    s2.position.set(-0.45, trunkH + 0.1, 0.2);
    s3.position.set(0.4, trunkH + 0.0, -0.25);
    this.add(s1, s2, s3);
  }
}

export class GreekStatue extends THREE.Group {
  constructor(options = {}) {
    super();

    const { color = THEME_COLORS.sandstone } = options;
    const mat = createOptimizedMaterial({ color });

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.4, 1.2),
      mat
    );
    plinth.position.y = 0.2;
    this.add(plinth);

    const bodySeg = getOptimizedSegments(16, 16);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1.6, bodySeg.segments),
      mat
    );
    body.position.y = 0.2 + 0.8;
    this.add(body);

    const headSeg = getOptimizedSegments(14, 14);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, headSeg.segments, headSeg.rings), mat);
    head.position.y = body.position.y + 0.95;
    this.add(head);

    const armSeg = getOptimizedSegments(10, 10);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, armSeg.segments), mat);
    armL.position.set(-0.45, body.position.y + 0.3, 0);
    armL.rotation.z = Math.PI / 6;
    const armR = armL.clone();
    armR.position.x = 0.45;
    armR.rotation.z = -Math.PI / 6;
    this.add(armL, armR);
  }
}

export class Obelisk extends THREE.Group {
  constructor(options = {}) {
    super();

    const {
      height = 6,
      baseSize = 1.2,
      color = THEME_COLORS.sandstone
    } = options;

    const mat = createOptimizedMaterial({ color });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseSize, 0.35, baseSize),
      mat
    );
    base.position.y = 0.175;
    this.add(base);

    const shaftSeg = getOptimizedSegments(4, 4);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.6, height, shaftSeg.segments),
      mat
    );
    shaft.position.y = 0.35 + height / 2;
    this.add(shaft);

    const tipSeg = getOptimizedSegments(4, 4);
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.6, tipSeg.segments),
      mat
    );
    tip.position.y = 0.35 + height + 0.3;
    this.add(tip);
  }
}

// Backward compatibility - factory functions
export function createHeroMesh() {
  return new HeroMesh();
}

export function createEnemyMesh(options = {}) {
  return new EnemyMesh(options);
}

export function createBillboardHPBar() {
  const bar = new BillboardHPBar();
  return { container: bar, fill: bar.fill };
}

export function createPortalMesh(color = THEME_COLORS.portal) {
  const portal = new PortalMesh(color);
  return { group: portal, ring: portal.ring, swirl: portal.swirl, glow: portal.glow };
}

export function createHouse() {
  return new House();
}

export function createHeroOverheadBars() {
  const bars = new HeroOverheadBars();
  return { container: bars, hpFill: bars.hpFill, mpFill: bars.mpFill };
}

export function createGreekColumn(options = {}) {
  return new GreekColumn(options);
}

export function createGreekTemple(options = {}) {
  return new GreekTemple(options);
}

export function createVilla(options = {}) {
  return new Villa(options);
}

export function createCypressTree() {
  return new CypressTree();
}

export function createOliveTree() {
  return new OliveTree();
}

export function createGreekStatue(options = {}) {
  return new GreekStatue(options);
}

export function createObelisk(options = {}) {
  return new Obelisk(options);
}
