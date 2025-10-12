import { getUpliftSummary } from "../../../uplift.js";
import { now } from "../../../utils.js";
import { STORAGE_KEYS } from "../../../../config/storage.js";
import * as THREE from "../../../../vendor/three/build/three.module.js";
import { HeroMesh } from "../../../meshes.js";

// Model preview state
let previewScene, previewCamera, previewRenderer, previewControls, previewModel;
let previewAnimationId = null;
let currentModelScale = 1.0; // Current scale value

/**
 * Render the Info tab: basic hero info (level, HP/MP).
 * Expects the panel element to be #heroTabInfo.
 */
export function renderInfoTab(panelEl, ctx = {}) {
  const { t, player } = ctx;
  if (!panelEl) return;

  // Get existing DOM elements
  const canvas = panelEl.querySelector('#heroModelCanvas');
  const loadingIndicator = panelEl.querySelector('.model-loading-indicator');
  const select = panelEl.querySelector('#heroModelSelect');
  const scaleValue = panelEl.querySelector('.model-scale-value');
  const scaleSlider = panelEl.querySelector('#heroModelScale');
  const urlInput = panelEl.querySelector('#heroModelUrl');
  const loadButton = panelEl.querySelector('#heroModelLoad');
  const applyButton = panelEl.querySelector('#heroModelApply');
  const infoContainer = panelEl.querySelector('.hero-info-left');

  // Setup 3D preview with existing elements
  if (canvas && loadingIndicator) {
    setup3DModelPreview(canvas, loadingIndicator, select, scaleValue, scaleSlider, urlInput, loadButton, applyButton);
  }

  // Build info section
  buildInfoSection(infoContainer, ctx);
}

/**
 * Setup the 3D model preview using existing DOM elements
 */
async function setup3DModelPreview(canvas, loadingIndicator, select, scaleValue, scaleSlider, urlInput, loadButton, applyButton) {
  // Initialize 3D preview and wait for it to complete
  await init3DPreview(canvas);

  // Load saved values
  const savedUrl = localStorage.getItem(STORAGE_KEYS.heroModelUrl);
  const savedScale = localStorage.getItem(STORAGE_KEYS.heroModelScale);
  currentModelScale = savedScale ? parseFloat(savedScale) : 1.0;

  // Set saved selection (options are pre-defined in HTML)
  if (savedUrl) {
    select.value = savedUrl;
  }

  // Update scale display
  scaleValue.textContent = currentModelScale.toFixed(1) + "x";
  scaleSlider.value = currentModelScale;

  // Setup event listeners
  select.addEventListener("change", (e) => {
    const url = e.target.value || null;
    if (url) {
      localStorage.setItem(STORAGE_KEYS.heroModelUrl, url);
    } else {
      localStorage.removeItem(STORAGE_KEYS.heroModelUrl);
    }
    load3DModel(url, loadingIndicator);
  });

  scaleSlider.addEventListener("input", (e) => {
    const scale = parseFloat(e.target.value);
    currentModelScale = scale;
    scaleValue.textContent = scale.toFixed(1) + "x";
    localStorage.setItem(STORAGE_KEYS.heroModelScale, scale.toString());
    
    if (previewModel) {
      previewModel.scale.setScalar(scale);
    }
  });

  loadButton.addEventListener("click", () => {
    const customUrl = urlInput.value.trim();
    if (customUrl) {
      localStorage.setItem(STORAGE_KEYS.heroModelUrl, customUrl);
      select.value = ""; // Deselect dropdown
      load3DModel(customUrl, loadingIndicator);
    }
  });

  applyButton.addEventListener("click", async () => {
    const shouldReload = await showApplyConfirm();
    if (shouldReload) {
      try {
        window.location.reload();
      } catch (_) {
        try {
          location.reload();
        } catch (_) {}
      }
    }
  });

  // Load initial model after scene is ready
  load3DModel(savedUrl, loadingIndicator);
}

/**
 * Show confirmation dialog for applying model changes
 */
function showApplyConfirm() {
  return new Promise((resolve) => {
    const confirmed = window.confirm(
      "Applying model changes will reload the game for a clean state.\n\nContinue?"
    );
    resolve(!!confirmed);
  });
}

/**
 * Initialize 3D preview scene
 */
async function init3DPreview(canvas) {
  // Clean up previous scene
  cleanup3DPreview();

  // Wait for canvas to have proper dimensions (with retry logic)
  await new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50; // max 1 second wait
    
    function checkDimensions() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      
      console.log(`[3D Preview] Checking canvas dimensions (attempt ${attempts + 1}): ${width}x${height}`);
      
      if (width > 0 && height > 0) {
        console.log('[3D Preview] Canvas has valid dimensions:', width, 'x', height);
        resolve();
      } else if (attempts < maxAttempts) {
        attempts++;
        // Wait 20ms and check again
        setTimeout(checkDimensions, 20);
      } else {
        console.warn('[3D Preview] Timeout waiting for canvas dimensions, proceeding anyway');
        resolve();
      }
    }
    
    checkDimensions();
  });

  console.log('[3D Preview] Final canvas size:', canvas.clientWidth, 'x', canvas.clientHeight);

  // Scene setup
  previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0x1a1a1a);

  // Camera
  const aspect = canvas.clientWidth / canvas.clientHeight;
  previewCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
  previewCamera.position.set(0, 1.5, 4);
  previewCamera.lookAt(0, 1, 0);

  // Renderer
  previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  previewRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  console.log('[3D Preview] Renderer initialized');

  // Enhanced Lighting Setup for better model visualization
  
  // Ambient light - provides base illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  previewScene.add(ambientLight);

  // Main directional light (key light) - primary light source
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(5, 8, 5);
  directionalLight.castShadow = true;
  previewScene.add(directionalLight);

  // Fill light - softens shadows from the opposite side
  const fillLight = new THREE.DirectionalLight(0xffd9b3, 0.5);
  fillLight.position.set(-5, 3, -5);
  previewScene.add(fillLight);

  // Rim light - creates edge highlights for better depth perception
  const rimLight = new THREE.DirectionalLight(0xff9966, 0.6);
  rimLight.position.set(0, 2, -8);
  previewScene.add(rimLight);

  // Top light - illuminates from above
  const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
  topLight.position.set(0, 10, 0);
  previewScene.add(topLight);

  // Hemisphere light - simulates sky and ground bounce light
  const hemisphereLight = new THREE.HemisphereLight(
    0xffffff, // sky color
    0x444444, // ground color
    0.5       // intensity
  );
  previewScene.add(hemisphereLight);

  // Add subtle point lights for accent
  const accentLight1 = new THREE.PointLight(0xff6b35, 0.3, 10);
  accentLight1.position.set(3, 2, 0);
  previewScene.add(accentLight1);

  const accentLight2 = new THREE.PointLight(0x3b8bff, 0.2, 10);
  accentLight2.position.set(-3, 1, 2);
  previewScene.add(accentLight2);

  // OrbitControls
  const { OrbitControls } = await import("../../../../vendor/three/examples/jsm/controls/OrbitControls.js");
  previewControls = new OrbitControls(previewCamera, canvas);
  previewControls.enableDamping = true;
  previewControls.dampingFactor = 0.05;
  previewControls.target.set(0, 1, 0);
  previewControls.update();

  console.log('[3D Preview] OrbitControls initialized');

  // Animation loop
  function animate() {
    previewAnimationId = requestAnimationFrame(animate);
    if (previewControls) previewControls.update();
    if (previewRenderer && previewScene && previewCamera) {
      previewRenderer.render(previewScene, previewCamera);
    }
  }
  animate();

  console.log('[3D Preview] Animation loop started');

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    if (!canvas || !previewCamera || !previewRenderer) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    previewCamera.aspect = width / height;
    previewCamera.updateProjectionMatrix();
    previewRenderer.setSize(width, height);
  });
  resizeObserver.observe(canvas);
}

/**
 * Load 3D model into preview
 */
async function load3DModel(url, loadingIndicator) {
  console.log('[3D Preview] load3DModel called with URL:', url);
  console.log('[3D Preview] previewScene exists:', !!previewScene);
  
  if (!previewScene) {
    console.warn('[3D Preview] Scene not ready, skipping model load');
    return;
  }

  // Clear ALL models from the scene (in case of overlapping async loads)
  clearAllModelsFromScene();

  // If no URL, show default built-in mesh (simplified version)
  if (!url) {
    console.log('[3D Preview] No URL, creating default mesh');
    createDefaultPreviewMesh(loadingIndicator);
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }
    return;
  }

  // Show loading indicator
  if (loadingIndicator) {
    loadingIndicator.style.display = "block";
  }

  try {
    console.log('[3D Preview] Loading GLTF model from:', url);
    const { GLTFLoader } = await import("../../../../vendor/three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader();

    loader.load(
      url,
      (gltf) => {
        console.log('[3D Preview] Model loaded successfully:', gltf);
        const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (model) {
          // Center and scale model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          model.position.sub(center);
          const maxDim = Math.max(size.x, size.y, size.z);
          const baseScale = 2 / maxDim;
          
          // Apply base scale normalized to model size, then apply user scale
          model.scale.setScalar(baseScale * currentModelScale);
          model.position.y = 1;

          console.log('[3D Preview] Model centered and scaled. Size:', size, 'Base Scale:', baseScale, 'User Scale:', currentModelScale);

          // Enable shadows
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          previewModel = model;
          previewScene.add(previewModel);
          console.log('[3D Preview] Model added to scene');
          
          // Hide loading indicator after model is added
          if (loadingIndicator) {
            loadingIndicator.style.display = "none";
          }
        }
      },
      (progress) => {
        const percent = (progress.loaded / progress.total * 100).toFixed(0);
        console.log('[3D Preview] Loading progress:', percent + '%');
        
        // Update loading text with progress
        if (loadingIndicator && progress.total > 0) {
          loadingIndicator.innerHTML = `<div style="margin-bottom: 8px;">⏳</div><div>Loading model... ${percent}%</div>`;
        }
      },
      (error) => {
        console.warn("[3D Preview] Failed to load model:", url, error);
        
        // Hide loading indicator on error
        if (loadingIndicator) {
          loadingIndicator.style.display = "none";
        }
        
        createDefaultPreviewMesh();
      }
    );
  } catch (error) {
    console.warn("[3D Preview] Error loading model:", url, error);
    
    // Hide loading indicator on error
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }
    
    createDefaultPreviewMesh();
  }
}

/**
 * Create default preview mesh (using actual HeroMesh)
 */
function createDefaultPreviewMesh(loadingIndicator) {
  console.log('[3D Preview] Creating default HeroMesh');
  if (!previewScene) {
    console.warn('[3D Preview] Scene not ready for default mesh');
    return;
  }

  // Create the actual HeroMesh from meshes.js
  const heroMesh = new HeroMesh();
  
  // Reset position (HeroMesh sets itself to 10, 1.1, 10 by default)
  // Set Y=1 to match camera lookAt position
  heroMesh.position.set(0, 1, 0);
  
  // Apply current scale
  heroMesh.scale.setScalar(currentModelScale);
  
  // Ensure all parts are visible (override first-person hiding)
  // fpHideParts contains: body, head, cloak, tunic, belt, shoulders, biceps, beard, crown, hairCap, pony
  if (heroMesh.fpHideParts && Array.isArray(heroMesh.fpHideParts)) {
    heroMesh.fpHideParts.forEach(part => {
      if (part) part.visible = true;
    });
  }
  
  // Also ensure the main body is visible
  if (heroMesh.body) heroMesh.body.visible = true;
  
  previewModel = heroMesh;
  previewScene.add(previewModel);
  console.log('[3D Preview] HeroMesh added to scene with scale:', currentModelScale, '(all parts visible)');
  
  // Hide loading indicator for default mesh (it loads instantly)
  if (loadingIndicator) {
    loadingIndicator.style.display = "none";
  }
}

/**
 * Clear all models from the scene (prevents overlapping when rapidly switching)
 */
function clearAllModelsFromScene() {
  if (!previewScene) return;
  
  // Remove the current tracked model
  if (previewModel) {
    previewScene.remove(previewModel);
    previewModel = null;
  }
  
  // Remove ALL mesh objects from scene (in case some weren't tracked)
  const objectsToRemove = [];
  previewScene.traverse((object) => {
    // Don't remove lights or camera
    if (object.isMesh || object.isGroup || object.isObject3D) {
      // Skip lights and camera
      if (!object.isLight && !object.isCamera) {
        objectsToRemove.push(object);
      }
    }
  });
  
  objectsToRemove.forEach(obj => {
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  });
  
  console.log('[3D Preview] Cleared', objectsToRemove.length, 'objects from scene');
}

/**
 * Cleanup 3D preview resources
 */
function cleanup3DPreview() {
  if (previewAnimationId) {
    cancelAnimationFrame(previewAnimationId);
    previewAnimationId = null;
  }

  if (previewModel && previewScene) {
    previewScene.remove(previewModel);
    previewModel = null;
  }

  if (previewRenderer) {
    previewRenderer.dispose();
    previewRenderer = null;
  }

  if (previewControls) {
    previewControls.dispose();
    previewControls = null;
  }

  previewScene = null;
  previewCamera = null;
}

/**
 * Build the info section (right side)
 */
function buildInfoSection(container, ctx) {
  const { t, player } = ctx;

  // Get existing items list from HTML
  const list = container.querySelector('.items-list');
  if (!list) return;
  
  // Clear existing content
  list.innerHTML = '';

  try {
    const tt = typeof t === "function" ? t : (x) => x;
    const level = Math.max(1, player?.level ?? 1);
    const hp = `${Math.floor(player?.hp ?? 0)}/${Math.floor(player?.maxHP ?? 0)}`;
    const mp = `${Math.floor(player?.mp ?? 0)}/${Math.floor(player?.maxMP ?? 0)}`;
    const baseDmg = Math.floor(player?.baseDamage ?? 0);
    const moveSpd = (player?.speed ?? 0).toFixed(1);
    const atkSpdMul = (player?.atkSpeedPerma ?? 1);
    const atkSpdPct = Math.round((atkSpdMul - 1) * 100);

    // Map info (name/depth/emoji) if available
    let mapName = "";
    let mapDepth = 0;
    let mapEmoji = "🗺️";
    try {
      const mods = ctx?.mapManager?.getModifiers?.() || {};
      mapName = mods.name || "";
      mapDepth = mods.depth || 0;
      const curIdx = ctx?.mapManager?.getCurrentIndex?.();
      mapEmoji = ctx?.mapManager?.emojiForIndex?.(curIdx) || "🗺️";
    } catch (_) {}

    // Uplifts summary
    let upliftLines = [];
    try { upliftLines = getUpliftSummary?.() || []; } catch (_) {}

    // Defense stat and status lists
    const defPct = Math.round((player?.defensePct ?? 0) * 100);
    const defActive = !!(player?.defenseUntil && now() < player.defenseUntil);
    const defRem = defActive ? Math.ceil(player.defenseUntil - now()) : 0;

    const buffs = [];
    const debuffs = [];

    if (defActive) {
      buffs.push(`Defense ${defPct}% (${defRem}s)`);
    }

    if (player?.speedBoostUntil && now() < player.speedBoostUntil && (player.speedBoostMul || 1) > 1) {
      const pmul = Math.round(((player.speedBoostMul || 1) - 1) * 100);
      const rem = Math.ceil(player.speedBoostUntil - now());
      buffs.push(`Move Speed +${pmul}% (${rem}s)`);
    }

    if (player?.atkSpeedUntil && now() < player.atkSpeedUntil && (player.atkSpeedMul || 1) !== 1) {
      const mul = player.atkSpeedMul || 1;
      const pct = Math.round((mul - 1) * 100);
      const rem = Math.ceil(player.atkSpeedUntil - now());
      buffs.push(`Attack Speed ${pct >= 0 ? "+" : ""}${pct}% (${rem}s)`);
    }

    if (player?.invulnUntil && now() < player.invulnUntil) {
      const rem = Math.ceil(player.invulnUntil - now());
      buffs.push(`Invulnerable (${rem}s)`);
    }

    if (player?.slowUntil && now() < player.slowUntil) {
      const slowF = player.slowFactor ?? 1;
      const red = Math.max(0, Math.round((1 - slowF) * 100));
      const rem = Math.ceil(player.slowUntil - now());
      debuffs.push(`Slowed ${red > 0 ? "-" + red : "?"}% (${rem}s)`);
    }

    if (player?.vulnUntil && now() < player.vulnUntil) {
      const vm = player.vulnMult || 1.25;
      const pct = Math.round((vm - 1) * 100);
      const rem = Math.ceil(player.vulnUntil - now());
      debuffs.push(`Vulnerable +${pct}% dmg taken (${rem}s)`);
    }

    function addRow(emoji, titleText, descText = "", reqText = "") {
      const row = document.createElement("div");
      row.className = "items-row";

      const thumb = document.createElement("div");
      thumb.className = "items-thumb";
      const em = document.createElement("div");
      em.className = "items-thumb-ph";
      em.textContent = emoji;
      try { em.style.fontSize = "42px"; em.style.lineHeight = "1"; } catch (_) {}
      thumb.appendChild(em);

      const info = document.createElement("div");
      const title = document.createElement("div");
      title.className = "items-title";
      title.textContent = titleText || "";
      const desc = document.createElement("div");
      desc.className = "items-desc";
      desc.textContent = descText || "";
      const req = document.createElement("div");
      req.className = "items-req";
      req.textContent = reqText || "";

      info.appendChild(title);
      if (desc.textContent) info.appendChild(desc);
      if (req.textContent) info.appendChild(req);

      const actions = document.createElement("div");
      actions.className = "items-actions";

      row.appendChild(thumb);
      row.appendChild(info);
      row.appendChild(actions);
      list.appendChild(row);
    }

    // Rows
    addRow("👤", tt("hero.info.title") || "Hero", `${tt("hero.info.level")} ${level} • ${tt("hero.info.move")} ${moveSpd} • ${tt("hero.info.baseDmg")} ${baseDmg}`, `${tt("hero.info.hp")} ${hp} • ${tt("hero.info.mp")} ${mp}`);
    addRow("⚡", tt("hero.info.attack"), `${tt("hero.info.attackSpeed")} ${atkSpdMul.toFixed(2)}x (${atkSpdPct >= 0 ? "+" : ""}${atkSpdPct}%)`, "");
    addRow("🛡️", tt("hero.info.defense"), `${tt("hero.info.defense")} ${defPct}%${defActive ? ` (${defRem}s)` : ""}`, defActive ? tt("hero.info.active") : tt("hero.info.inactive"));
    if (mapName) {
      addRow(mapEmoji, tt("hero.info.map"), mapName, mapDepth ? `${tt("hero.info.depth")} +${mapDepth}` : "");
    }
    addRow("🟢", tt("hero.info.buffs"), (buffs.length ? buffs.join(", ") : "—"), "");
    addRow("🔴", tt("hero.info.debuffs"), (debuffs.length ? debuffs.join(", ") : "—"), "");
    addRow("📈", tt("hero.info.uplifts"), (upliftLines.length ? upliftLines.join(", ") : tt("uplift.none")), "");
  } catch (_) {
    const row = document.createElement("div");
    row.className = "items-row";
    const thumb = document.createElement("div");
    thumb.className = "items-thumb";
    const em = document.createElement("div");
    em.className = "items-thumb-ph";
    em.textContent = "ℹ️";
    try { em.style.fontSize = "42px"; em.style.lineHeight = "1"; } catch (_) {}
    thumb.appendChild(em);
    const infoDiv = document.createElement("div");
    const title = document.createElement("div");
    title.className = "items-title";
    title.textContent = "Info";
    const desc = document.createElement("div");
    desc.className = "items-desc";
    desc.textContent = "—";
    infoDiv.appendChild(title);
    infoDiv.appendChild(desc);
    const actions = document.createElement("div");
    actions.className = "items-actions";
    row.appendChild(thumb);
    row.appendChild(infoDiv);
    row.appendChild(actions);
    list.appendChild(row);
  }
  
  // List is already in the DOM, no need to append
}
