import { getUpliftSummary } from "../../../uplift.js";
import { now } from "../../../utils.js";
import { STORAGE_KEYS } from "../../../../config/storage.js";
import * as THREE from "../../../../vendor/three/build/three.module.js";

// Model preview state
let previewScene, previewCamera, previewRenderer, previewControls, previewModel;
let previewAnimationId = null;

// Available default models
const DEFAULT_MODELS = [
  { label: "Default (Built-in 3D)", value: null },
  { label: "Model 1", value: "model/game-gof-model-01.glb" },
  { label: "Model 2", value: "model/game-gof-model-02.glb" },
  { label: "Model 3", value: "model/game-gof-model-03.glb" },
  { label: "Model 4", value: "model/game-gof-model-04.glb" }
];

/**
 * Render the Info tab: basic hero info (level, HP/MP).
 * Expects the panel element to be #heroTabInfo.
 */
export function renderInfoTab(panelEl, ctx = {}) {
  const { t, player } = ctx;
  if (!panelEl) return;

  // Clear previous content
  panelEl.innerHTML = "";

  // Create main layout wrapper (1/3 + 2/3)
  const mainLayout = document.createElement("div");
  mainLayout.style.display = "flex";
  mainLayout.style.gap = "16px";
  mainLayout.style.height = "100%";
  mainLayout.style.overflow = "hidden";

  // Left section: 3D Model Preview (1/3)
  const leftSection = document.createElement("div");
  leftSection.style.flex = "0 0 33.333%";
  leftSection.style.display = "flex";
  leftSection.style.flexDirection = "column";
  leftSection.style.gap = "12px";
  leftSection.style.overflow = "auto";

  // Right section: Info (2/3)
  const rightSection = document.createElement("div");
  rightSection.style.flex = "1";
  rightSection.style.overflow = "auto";

  // Build 3D model preview section
  build3DModelPreview(leftSection);

  // Build info section
  buildInfoSection(rightSection, ctx);

  mainLayout.appendChild(leftSection);
  mainLayout.appendChild(rightSection);
  panelEl.appendChild(mainLayout);
}

/**
 * Build the 3D model preview and controls
 */
async function build3DModelPreview(container) {
  // Title
  const title = document.createElement("div");
  title.className = "items-title";
  title.textContent = "🎨 Hero Model";
  title.style.padding = "8px";
  title.style.fontSize = "16px";
  title.style.fontWeight = "bold";
  container.appendChild(title);

  // Canvas container
  const canvasContainer = document.createElement("div");
  canvasContainer.style.width = "100%";
  canvasContainer.style.height = "240px";
  canvasContainer.style.backgroundColor = "#1a1a1a";
  canvasContainer.style.borderRadius = "8px";
  canvasContainer.style.position = "relative";
  canvasContainer.style.overflow = "hidden";

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvasContainer.appendChild(canvas);
  container.appendChild(canvasContainer);

  // Initialize 3D preview and wait for it to complete
  await init3DPreview(canvas);

  // Model selection dropdown
  const selectLabel = document.createElement("div");
  selectLabel.className = "items-desc";
  selectLabel.textContent = "Select Model:";
  selectLabel.style.padding = "0 8px";
  selectLabel.style.marginTop = "8px";
  container.appendChild(selectLabel);

  const select = document.createElement("select");
  select.style.width = "100%";
  select.style.padding = "8px";
  select.style.fontSize = "14px";
  select.style.borderRadius = "4px";
  select.style.border = "1px solid #444";
  select.style.backgroundColor = "#2a2a2a";
  select.style.color = "#fff";
  select.style.cursor = "pointer";

  DEFAULT_MODELS.forEach(model => {
    const option = document.createElement("option");
    option.value = model.value || "";
    option.textContent = model.label;
    select.appendChild(option);
  });

  // Load saved selection
  const savedUrl = localStorage.getItem(STORAGE_KEYS.heroModelUrl);
  if (savedUrl) {
    select.value = savedUrl;
  }

  select.addEventListener("change", (e) => {
    const url = e.target.value || null;
    if (url) {
      localStorage.setItem(STORAGE_KEYS.heroModelUrl, url);
    } else {
      localStorage.removeItem(STORAGE_KEYS.heroModelUrl);
    }
    load3DModel(url);
  });
  container.appendChild(select);

  // Custom URL input
  const urlLabel = document.createElement("div");
  urlLabel.className = "items-desc";
  urlLabel.textContent = "Or paste custom URL:";
  urlLabel.style.padding = "0 8px";
  urlLabel.style.marginTop = "12px";
  container.appendChild(urlLabel);

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.placeholder = "https://example.com/model.glb";
  urlInput.style.width = "100%";
  urlInput.style.padding = "8px";
  urlInput.style.fontSize = "14px";
  urlInput.style.borderRadius = "4px";
  urlInput.style.border = "1px solid #444";
  urlInput.style.backgroundColor = "#2a2a2a";
  urlInput.style.color = "#fff";

  const loadButton = document.createElement("button");
  loadButton.textContent = "Load";
  loadButton.style.width = "100%";
  loadButton.style.marginTop = "8px";
  loadButton.style.padding = "8px";
  loadButton.style.fontSize = "14px";
  loadButton.style.borderRadius = "4px";
  loadButton.style.border = "1px solid #ff6b35";
  loadButton.style.backgroundColor = "#ff6b35";
  loadButton.style.color = "#fff";
  loadButton.style.cursor = "pointer";
  loadButton.style.fontWeight = "bold";

  loadButton.addEventListener("click", () => {
    const customUrl = urlInput.value.trim();
    if (customUrl) {
      localStorage.setItem(STORAGE_KEYS.heroModelUrl, customUrl);
      select.value = ""; // Deselect dropdown
      load3DModel(customUrl);
    }
  });

  container.appendChild(urlInput);
  container.appendChild(loadButton);

  // Load initial model after scene is ready
  load3DModel(savedUrl);
}

/**
 * Initialize 3D preview scene
 */
async function init3DPreview(canvas) {
  // Clean up previous scene
  cleanup3DPreview();

  // Wait for canvas to have dimensions
  await new Promise(resolve => {
    if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      resolve();
    } else {
      requestAnimationFrame(() => resolve());
    }
  });

  console.log('[3D Preview] Canvas size:', canvas.clientWidth, 'x', canvas.clientHeight);

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

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  previewScene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  previewScene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-5, 0, -5);
  previewScene.add(fillLight);

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
async function load3DModel(url) {
  console.log('[3D Preview] load3DModel called with URL:', url);
  console.log('[3D Preview] previewScene exists:', !!previewScene);
  
  if (!previewScene) {
    console.warn('[3D Preview] Scene not ready, skipping model load');
    return;
  }

  // Remove previous model
  if (previewModel) {
    previewScene.remove(previewModel);
    previewModel = null;
  }

  // If no URL, show default built-in mesh (simplified version)
  if (!url) {
    console.log('[3D Preview] No URL, creating default mesh');
    createDefaultPreviewMesh();
    return;
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
          const scale = 2 / maxDim;
          model.scale.setScalar(scale);
          model.position.y = 1;

          console.log('[3D Preview] Model centered and scaled. Size:', size, 'Scale:', scale);

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
        }
      },
      (progress) => {
        console.log('[3D Preview] Loading progress:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
      },
      (error) => {
        console.warn("[3D Preview] Failed to load model:", url, error);
        createDefaultPreviewMesh();
      }
    );
  } catch (error) {
    console.warn("[3D Preview] Error loading model:", url, error);
    createDefaultPreviewMesh();
  }
}

/**
 * Create default preview mesh (simplified hero)
 */
function createDefaultPreviewMesh() {
  console.log('[3D Preview] Creating default mesh');
  if (!previewScene) {
    console.warn('[3D Preview] Scene not ready for default mesh');
    return;
  }

  const group = new THREE.Group();

  // Simple capsule body
  const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff6b35 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.1;
  group.add(head);

  // Simple crown
  const crownGeo = new THREE.TorusGeometry(0.32, 0.04, 8, 16);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.6 });
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.position.y = 1.3;
  crown.rotation.x = Math.PI / 2;
  group.add(crown);

  group.position.y = 1;
  previewModel = group;
  previewScene.add(previewModel);
  console.log('[3D Preview] Default mesh added to scene');
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

  // Create items list
  const list = document.createElement("div");
  list.className = "items-list";

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

  container.appendChild(list);
}
