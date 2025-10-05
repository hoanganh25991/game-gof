// GoF RPG — Modular Orchestrator
// This refactor splits the original monolithic file into modules per system.
// Behavior is preserved; tuning values unchanged.

import * as THREE from "../vendor/three/build/three.module.js";
import { COLOR, WORLD, SKILLS, VILLAGE_POS, REST_RADIUS, SCALING, storageKey } from "./constants.js";
import { initWorld, updateCamera, updateGridFollow, updateEnvironmentFollow, addResizeHandler, getTargetPixelRatio } from "./world.js";
import { UIManager } from "./ui/hud/index.js";
import { Player, Enemy, getNearestEnemy, handWorldPos } from "./entities.js";
import { EffectsManager, createGroundRing } from "./effects.js";
import { SkillsSystem } from "./skills.js";
import { createRaycast } from "./raycast.js";
import { createHouse, createHeroOverheadBars } from "./meshes.js";
import { initEnvironment } from "./environment.js";
import { distance2D, dir2D, now, clamp01 } from "./utils.js";
import { initPortals } from "./portals.js";
import { initI18n, setLanguage, getLanguage, t } from "./i18n.js";
import { initSplash } from "./splash.js";
import { initTouchControls } from "./touch.js";
import { createInputService } from "./input_service.js";
import { SKILL_POOL, DEFAULT_LOADOUT } from "./skills_pool.js";
import { loadOrDefault, saveLoadout, resolveLoadout } from "./loadout.js";
import { audio } from "./audio.js";
import { createVillagesSystem } from "./villages.js";
import { createMapManager } from "./maps.js";
import { initHeroPreview } from "./ui/hero/preview.js";
import { startInstructionGuide as startInstructionGuideOverlay } from "./ui/guide.js";
import { setupSettingsScreen } from "./ui/settings/index.js";
import { renderHeroScreen as renderHeroScreenUI } from "./ui/hero/index.js";
import { updateSkillBarLabels } from "./ui/icons.js";
import { promptBasicUpliftIfNeeded } from "./uplift.js";
import { setupDesktopControls } from "./ui/deskop-controls.js"
import * as payments from './payments.js';
import { initPaymentsBootstrap } from "./payments_boot.js";
import { getSkillUpgradeManager } from "./skill_upgrades.js";
import { ChunkManager, getOrInitWorldSeed } from "./chunk_manager.js";
import { isMobile, MOBILE_OPTIMIZATIONS, applyMobileRendererHints } from "./config/mobile.js";
import { createDynamicSpawner } from "./spawn.js";
import { createVillageFence } from "./village_fence.js";
import { createPerformanceTracker, initVfxGating } from "./perf.js";
import { createPlayerSystem } from "./player_system.js";
import { createIndicators } from "./ui/indicators.js";
import { createEnemiesSystem } from "./enemies_system.js";
import { wireUIBindings } from "./ui/bindings.js";
import { wireMarkCooldownUI } from "./ui/mark_cooldown.js";
import { wireTopBar } from "./ui/topbar.js";


/* Mobile Device Detection & Optimization moved to ./config/mobile.js */

// ------------------------------------------------------------
// Bootstrapping world, UI, effects
// ------------------------------------------------------------
const { renderer, scene, camera, ground, cameraOffset, cameraShake } = initWorld();
const _baseCameraOffset = cameraOffset.clone();
const ui = new UIManager();

/* Mobile: Aggressive GPU/CPU optimizations */
applyMobileRendererHints(renderer);

// Render quality preference (persisted). Default to "high" on desktop, "medium" on mobile.
const _renderPrefs = JSON.parse(localStorage.getItem(storageKey("renderPrefs")) || "{}");
let renderQuality = (typeof _renderPrefs.quality === "string" && ["low", "medium", "high"].includes(_renderPrefs.quality))
  ? _renderPrefs.quality
  : (isMobile ? "medium" : "high");

// Mobile: Force medium quality on first run for optimal performance
if (isMobile && !_renderPrefs.quality) {
  renderQuality = "medium";
  try {
    const prefs = { ..._renderPrefs, quality: "medium" };
    localStorage.setItem(storageKey("renderPrefs"), JSON.stringify(prefs));
    console.info("[Mobile] Auto-set quality to 'medium' for optimal performance");
  } catch (_) {}
}

const effects = new EffectsManager(scene, { quality: renderQuality });
const indicators = createIndicators({
  effects,
  COLOR,
  createGroundRing,
  isMobile,
  MOBILE_OPTIMIZATIONS,
  handWorldPos
});
const mapManager = createMapManager();
let chunkMgr = null;
const WORLD_SEED = getOrInitWorldSeed();


/* Perf tracker (perf.js): smoothed FPS, 1% low, frame ms, and renderer.info snapshot */
const perfTracker = createPerformanceTracker(renderer, { targetFPS: 90, autoAdjust: true });

const playerSystem = createPlayerSystem({ now, dir2D, distance2D, WORLD, renderer });

// Tiny reusable object pool to avoid allocations in hot loops.
// Temp vectors/quaternions used across update loops to reduce GC pressure.
const __tempVecA = new THREE.Vector3();
const __tempVecB = new THREE.Vector3();
const __tempVecC = new THREE.Vector3();
const __tempQuat = new THREE.Quaternion();
let __tempVecQuatOrVec;

/* VFX gating based on perf.js tracker */
const shouldSpawnVfx = initVfxGating({
  camera,
  isMobile,
  mobileOpts: MOBILE_OPTIMIZATIONS,
  initialQuality: renderQuality,
  tracker: perfTracker
});

// Throttle values for UI updates (ms) - mobile uses slower updates
const HUD_UPDATE_MS = isMobile ? MOBILE_OPTIMIZATIONS.hudUpdateMs : 150;
const MINIMAP_UPDATE_MS = isMobile ? MOBILE_OPTIMIZATIONS.minimapUpdateMs : 150;
try {
  // expose for runtime tuning/debug if needed
  window.__HUD_UPDATE_MS = HUD_UPDATE_MS;
  window.__MINIMAP_UPDATE_MS = MINIMAP_UPDATE_MS;
  window.__IS_MOBILE = isMobile;
} catch (_) {}

// last-update timestamps (initialized lazily in the loop)
if (!window.__lastHudT) window.__lastHudT = 0;
if (!window.__lastMinimapT) window.__lastMinimapT = 0;
function __computePerf(nowMs) {
  try {
    perfTracker.update(nowMs);
    perfTracker.maybeAutoAdjustVfxQuality();
  } catch (_) {}
}
function getPerf() {
  try { return perfTracker.getPerf(); } catch (_) { return { fps: 0, fpsLow1: 0, ms: 0, avgMs: 0 }; }
}

// Load environment preferences from localStorage (persist rain + density)
const _envPrefs = JSON.parse(localStorage.getItem(storageKey("envPrefs")) || "{}");
let envRainState = !!_envPrefs.rain;
let envDensityIndex = Number.isFinite(parseInt(_envPrefs.density, 10)) ? parseInt(_envPrefs.density, 10) : 1;
let envRainLevel = Number.isFinite(parseInt(_envPrefs.rainLevel, 10)) ? parseInt(_envPrefs.rainLevel, 10) : 1;

// Presets used by the density slider (kept in sync with index 0..2)
const ENV_PRESETS = [
  { treeCount: 20, rockCount: 10, flowerCount: 60, villageCount: 1 },
  { treeCount: 60, rockCount: 30, flowerCount: 120, villageCount: 1 },
  { treeCount: 140, rockCount: 80, flowerCount: 300, villageCount: 2 },
];

envDensityIndex = Math.min(Math.max(0, envDensityIndex), ENV_PRESETS.length - 1);

// Mobile: Apply environment density reduction and disable rain
let envPreset = ENV_PRESETS[envDensityIndex];
if (isMobile) {
  const reduction = MOBILE_OPTIMIZATIONS.envDensityReduction;
  envPreset = {
    treeCount: Math.floor(envPreset.treeCount * reduction),
    rockCount: Math.floor(envPreset.rockCount * reduction),
    flowerCount: Math.floor(envPreset.flowerCount * reduction),
    villageCount: envPreset.villageCount,
  };
  
  // Disable rain on mobile - it's very expensive
  if (MOBILE_OPTIMIZATIONS.disableRain) {
    envRainState = false;
    console.info('[Mobile] Disabled rain for performance');
  }
}

let env = null;
// Initialize chunking-based environment streaming (if enabled), and reduce static scatter to zero
if (WORLD && WORLD.chunking && WORLD.chunking.enabled) {
  const chunkCfg = WORLD.chunking || {};
  const size = Math.max(50, chunkCfg.size || 200);
  const ground = (WORLD.groundSize || 500);
  const groundArea = ground * ground;
  const chunkArea = size * size;
  const densityScale = Math.max(0.01, Math.min(1, chunkArea / groundArea));
  const dens = {
    trees: Math.max(0, Math.floor((envPreset.treeCount || 0) * densityScale)),
    rocks: Math.max(0, Math.floor((envPreset.rockCount || 0) * densityScale)),
    flowers: Math.max(0, Math.floor((envPreset.flowerCount || 0) * densityScale)),
  };
  try {
    chunkMgr = new ChunkManager(scene, {
      chunkSize: size,
      radius: Math.max(1, chunkCfg.radius || 2),
      seed: WORLD_SEED,
      storagePrefix: chunkCfg.storagePrefix || "gof.chunk",
      densities: dens,
    });
    // Prevent static environment from duplicating streamed props
    envPreset = Object.assign({}, envPreset, { treeCount: 0, rockCount: 0, flowerCount: 0 });
  } catch (e) {
    console.warn("[Chunking] init failed, falling back to static env:", e);
    chunkMgr = null;
  }
}
env = initEnvironment(scene, Object.assign({}, envPreset, { enableRain: envRainState, quality: renderQuality, seed: WORLD_SEED }));
try {
  if (envRainState && env && typeof env.setRainLevel === "function") {
    env.setRainLevel(Math.min(Math.max(0, envRainLevel), 2));
  }
} catch (_) {}

/* Initialize splash first (shows full-screen loader), then i18n */
initSplash();
// Initialize i18n (default Vietnamese)
initI18n();
// Bottom Middle = Desktop Controls
setupDesktopControls();

/* Payments bootstrap */
initPaymentsBootstrap({ payments, storageKey });

/* Audio: preferences + initialize on first user gesture. Do not auto-start music if disabled. */
const _audioPrefs = JSON.parse(localStorage.getItem(storageKey("audioPrefs")) || "{}");
let musicEnabled = _audioPrefs.music !== false; // default true
let sfxEnabled = _audioPrefs.sfx !== false;     // default true

// renderQuality initialized above from renderPrefs

audio.startOnFirstUserGesture(document);
/* Apply SFX volume per preference (default 0.5 when enabled) */
try { audio.setSfxVolume(sfxEnabled ? 0.5 : 0.0); } catch (_) {}

const __startMusicOnce = (ev) => {
  if (!musicEnabled) return;
  try {
    // FreePD CC0: "Ice and Snow" — soft, atmospheric, focus-friendly
    audio.ensureBackgroundMusic("audio/background-music-soft-calm-333111.mp3", { volume: 0.35, loop: true });
  } catch (e) {
    // Fallback to generative if streaming fails
    try { audio.setMusicVolume(0.35); audio.startMusic(); } catch (_) {}
  } finally {
    try {
      document.removeEventListener("click", __startMusicOnce, true);
      document.removeEventListener("touchstart", __startMusicOnce, true);
      document.removeEventListener("keydown", __startMusicOnce, true);
    } catch (_) {}
  }
};
/* Only attach auto-start listeners when music is enabled */
if (musicEnabled) {
  document.addEventListener("click", __startMusicOnce, true);
  document.addEventListener("touchstart", __startMusicOnce, true);
  document.addEventListener("keydown", __startMusicOnce, true);
}

// Settings and overlay elements
const btnSettingsScreen = document.getElementById("btnSettingsScreen");
const btnCloseSettings = document.getElementById("btnCloseSettings");
const settingsPanel = document.getElementById("settingsPanel");
const btnHeroScreen = document.getElementById("btnHeroScreen");
const heroScreen = document.getElementById("heroScreen");
const introScreen = document.getElementById("introScreen");
const btnStart = document.getElementById("btnStart");
const btnCamera = document.getElementById("btnCamera");
const btnPortal = document.getElementById("btnPortal");
const btnMark = document.getElementById("btnMark");
const langVi = document.getElementById("langVi");
const langEn = document.getElementById("langEn");
let firstPerson = false;
// preserve original camera defaults
const _defaultCameraNear = camera.near || 0.1;
const _defaultCameraFov = camera.fov || 60;

/**
 * Toggle first-person mode and adjust camera projection to reduce clipping.
 * When enabled we use a tighter near plane and slightly wider FOV for a comfortable FPS feel.
 */
function setFirstPerson(enabled) {
  firstPerson = !!enabled;
  if (firstPerson) {
    camera.near = 0.01;
    camera.fov = 75;
    camera.updateProjectionMatrix();
    // Hide torso/head/cloak parts so arms remain visible in first-person
    try {
      if (typeof player !== "undefined" && player?.mesh?.userData?.fpHide) {
        player.mesh.userData.fpHide.forEach((o) => { if (o) o.visible = false; });
      }
      if (typeof heroBars !== "undefined" && heroBars?.container) {
        heroBars.container.visible = false;
      }
    } catch (e) {}
  } else {
    camera.near = _defaultCameraNear;
    camera.fov = _defaultCameraFov;
    camera.updateProjectionMatrix();
    // Restore visibility
    try {
      if (typeof player !== "undefined" && player?.mesh?.userData?.fpHide) {
        player.mesh.userData.fpHide.forEach((o) => { if (o) o.visible = true; });
      }
      if (typeof heroBars !== "undefined" && heroBars?.container) {
        heroBars.container.visible = true;
      }
    } catch (e) {}
  }
}

// Settings handlers (refactored)
const audioCtl = {
  audio,
  getMusicEnabled: () => musicEnabled,
  setMusicEnabled: (v) => { musicEnabled = !!v; try { localStorage.setItem(storageKey("audioPrefs"), JSON.stringify({ music: musicEnabled, sfx: sfxEnabled })); } catch (_) {} },
  getSfxEnabled: () => sfxEnabled,
  setSfxEnabled: (v) => { sfxEnabled = !!v; try { localStorage.setItem(storageKey("audioPrefs"), JSON.stringify({ music: musicEnabled, sfx: sfxEnabled })); } catch (_) {} },
};
const environmentCtx = {
  scene,
  ENV_PRESETS,
  initEnvironment,
  updateEnvironmentFollow,
  get player() { return player; },
  getState: () => ({ env, envRainState, envDensityIndex, envRainLevel }),
  setState: (st) => {
    env = st.env ?? env;
    envRainState = st.envRainState ?? envRainState;
    envDensityIndex = st.envDensityIndex ?? envDensityIndex;
    envRainLevel = st.envRainLevel ?? envRainLevel;
  },
};
const renderCtx = {
  renderer,
  cameraOffset,
  baseCameraOffset: _baseCameraOffset,
  getQuality: () => renderQuality,
  setQuality: (q) => { renderQuality = q; },
  getTargetPixelRatio: () => getTargetPixelRatio(),
  getPerf,
};
setupSettingsScreen({
  t,
  startInstructionGuide: () => startInstructionGuideOverlay(),
  elements: { btnSettingsScreen, btnCloseSettings, settingsPanel },
  environment: environmentCtx,
  render: renderCtx,
  audioCtl,
});

// Wire "Restore purchases" button in Settings to the restorePurchases() helper.
// Provides lightweight UI feedback (center message) while the request is processed.
(function wireRestoreButton() {
  const btn = document.getElementById('btnRestorePurchases');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      btn.disabled = true;
      setCenterMsg && setCenterMsg('Checking purchases...');
      const res = await window.restorePurchases();
      // Handling possible responses:
      // - SKU flow: array of purchases returned
      // - App-priced flow: { ok: true, note: 'Requested wrapper license status' } and wrapper will post TWA_LICENSE_STATUS
      if (Array.isArray(res)) {
        if (res.length > 0 || window.__appPurchased) {
          setCenterMsg && setCenterMsg('Purchase restored.');
        } else {
          setCenterMsg && setCenterMsg('No purchases found.');
        }
      } else if (res && res.ok && res.note) {
        // Requested wrapper/license re-check — final state will be delivered via TWA_LICENSE_STATUS message.
        setCenterMsg && setCenterMsg('Requested license status; awaiting response...');
      } else {
        // Fallback: rely on window.__appPurchased
        if (window.__appPurchased) {
          setCenterMsg && setCenterMsg('Purchase restored.');
        } else {
          setCenterMsg && setCenterMsg('No purchase found.');
        }
      }
      // Clear the message shortly after
      setTimeout(() => { try { clearCenterMsg && clearCenterMsg(); } catch (_) {} }, 1400);
    } catch (err) {
      console.warn('[UI] restorePurchases click failed', err);
      try { setCenterMsg && setCenterMsg('Restore failed'); } catch (_) {}
      setTimeout(() => { try { clearCenterMsg && clearCenterMsg(); } catch (_) {} }, 1400);
    } finally {
      try { btn.disabled = false; } catch (_) {}
    }
  });
})();

// Hero open/close
// Thin wrapper to render hero screen using modular UI
function showHeroScreen(initialTab = "skills") {
  const ctx = {
    t,
    player,
    SKILL_POOL,
    DEFAULT_LOADOUT,
    currentLoadout,
    setLoadoutAndSave,
    updateSkillBarLabels,
    mapManager,
    portals,
    enemies,
    effects,
    WORLD,
    setCenterMsg,
    clearCenterMsg,
    applyMapModifiersToEnemy,
    adjustEnemyCountForMap: adjustEnemyCountForCurrentMap,
  };
  try { audio.ensureBackgroundMusic("audio/background-music-soft-calm-333111.mp3", { volume: 0.35, loop: true }); } catch (_) {}
  try { renderHeroScreenUI(initialTab, ctx); } catch (_) {}
}
/* Top bar wiring consolidated */
const disposeTopBar = wireTopBar({
  elements: { btnHeroScreen, heroScreen, btnStart, introScreen, btnCamera, btnPortal, btnMark },
  actions: {
    showHeroScreen: () => showHeroScreen("skills"),
    setFirstPerson: (enabled) => setFirstPerson(enabled),
    getFirstPerson: () => firstPerson,
    portals,
    player,
    setCenterMsg,
    clearCenterMsg,
    startInstructionGuide: startInstructionGuideOverlay
  }
});
try { window.__disposeTopBar = disposeTopBar; } catch (_) {}


/* UI bindings for environment, render, and audio controls */
wireUIBindings({
  storageKey,
  scene,
  player,
  ENV_PRESETS,
  initEnvironment,
  updateEnvironmentFollow,
  envAccess: { get: () => environmentCtx.getState(), set: (st) => environmentCtx.setState(st) },
  renderQualityRef: { get: () => renderCtx.getQuality(), set: (q) => renderCtx.setQuality(q) },
  cameraOffset,
  baseCameraOffset: _baseCameraOffset,
  audioCtl,
  audio
});





// Settings UI initialized via setupSettingsScreen()

// Selection/aim indicators
/* Load and apply saved loadout so runtime SKILLS.Q/W/E/R reflect player's choice */
let currentLoadout = loadOrDefault(SKILL_POOL, DEFAULT_LOADOUT);

/**
 * Apply an array of 4 skill ids to the SKILLS mapping (mutates exported SKILLS).
 * Also applies skill upgrade bonuses from the upgrade system.
 */
function applyLoadoutToSKILLS(loadoutIds) {
  const idMap = new Map(SKILL_POOL.map((s) => [s.id, s]));
  const keys = ["Q", "W", "E", "R"];
  const upgradeManager = getSkillUpgradeManager();
  
  for (let i = 0; i < 4; i++) {
    const id = loadoutIds[i];
    const def = idMap.get(id);
    if (def) {
      // shallow copy to avoid accidental shared references
      const baseSkill = Object.assign({}, def);
      // Apply upgrade bonuses based on skill level
      const upgradedSkill = upgradeManager.applyUpgradeBonuses(id, baseSkill);
      SKILLS[keys[i]] = upgradedSkill;
    }
  }
}

/**
 * Persist and apply a new loadout.
 */
function setLoadoutAndSave(ids) {
  const resolved = resolveLoadout(SKILL_POOL, ids, DEFAULT_LOADOUT);
  currentLoadout = resolved;
  applyLoadoutToSKILLS(currentLoadout);
  saveLoadout(currentLoadout);
  updateSkillBarLabels();
  try {
    console.info("[WORLD]", {
      attackRange: WORLD.attackRange,
      attackRangeMult: WORLD.attackRangeMult,
      basicAttackCooldown: WORLD.basicAttackCooldown,
      basicAttackDamage: WORLD.basicAttackDamage
    });
  } catch (e) {}
}

// Apply initial loadout so SKILLS are correct for subsequent UI/effects
applyLoadoutToSKILLS(currentLoadout);
updateSkillBarLabels();
try { window.updateSkillBarLabels = updateSkillBarLabels; } catch (e) {}
window.addEventListener("loadout-changed", () => {
  try {
    // Reload and apply loadout to runtime SKILLS mapping and refresh the HUD skillbar.
    currentLoadout = loadOrDefault(SKILL_POOL, DEFAULT_LOADOUT);
    applyLoadoutToSKILLS(currentLoadout);
    updateSkillBarLabels();
    
    // Critical: Notify the SkillsSystem instance to refresh its internal skill references
    if (skills && typeof skills.refreshSkills === 'function') {
      skills.refreshSkills();
    }
    
    // Do NOT re-render the Hero screen here. The Skills tab updates its slots in-place.
    // This preserves tab scroll positions (e.g., Maps list) and prevents cross-tab DOM pollution.
  } catch (_) {}
});

const aimPreview = null;

const attackPreview = null;

// Center message helpers wired to UI
const setCenterMsg = (t) => ui.setCenterMsg(t);
const clearCenterMsg = () => ui.clearCenterMsg();

/* ------------------------------------------------------------
   Entities and Game State
------------------------------------------------------------ */
const player = new Player();
scene.add(player.mesh);
try { updateEnvironmentFollow(env, player); } catch (e) {}
// Map unlock check on startup and on level-up
try {
  mapManager.unlockByLevel(player.level);
  window.addEventListener("player-levelup", (ev) => {
    try {
      const lvl = ev?.detail?.level || player.level;
      const unlockedChanged = mapManager.unlockByLevel(lvl);
      // Auto-advance to highest unlocked map when new map unlocks
      if (unlockedChanged) {
        const prevIdx = mapManager.getCurrentIndex?.() || 1;
        const maxIdx = mapManager.getUnlockedMax?.() || prevIdx;
        if (maxIdx > prevIdx) {
          if (mapManager.setCurrent?.(maxIdx)) {
            // Reapply modifiers to existing enemies on map switch and adjust density
            enemies.forEach((en) => applyMapModifiersToEnemy(en));
            try { adjustEnemyCountForCurrentMap(); } catch (_) {}
            setCenterMsg && setCenterMsg(`Unlocked and switched to MAP ${maxIdx}`);
            setTimeout(() => clearCenterMsg(), 1400);
          }
        }
      }
    } catch (_) {}
  });
} catch (_) {}
try { promptBasicUpliftIfNeeded(player); } catch (_) {}
try { 
  window.addEventListener("player-levelup", () => { 
    try { promptBasicUpliftIfNeeded(player); } catch (_) {}
    // Adjust enemy count when player levels up (spawn more, stronger enemies)
    try { adjustEnemyCountForCurrentMap(); } catch (_) {}
  }); 
} catch (_) {}

// Hero overhead HP/MP bars
const heroBars = createHeroOverheadBars();
player.mesh.add(heroBars.container);

// Respawn/death messaging
player.onDeath = () => {
  player.deadUntil = now() + 3;
  setCenterMsg(t("death.msg"));
  player.aimMode = false;
  player.aimModeSkill = null;
  player.moveTarget = null;
  player.target = null;
};

/* Map modifiers helper */
function applyMapModifiersToEnemy(en) {
  try {
    const mods = mapManager.getModifiers?.() || {};
    // Apply multipliers
    en.maxHP = Math.max(1, Math.floor(en.maxHP * (mods.enemyHpMul || 1)));
    en.hp = Math.max(1, Math.min(en.maxHP, en.hp));
    en.attackDamage = Math.max(1, Math.floor(en.attackDamage * (mods.enemyDmgMul || 1)));
    en.speed = Math.max(0.1, en.speed * (mods.enemySpeedMul || 1));
    if (mods.enemyTint) {
      en.beamColor = mods.enemyTint;
      try {
        const tint = new THREE.Color(mods.enemyTint);
        en.mesh.traverse?.((o) => {
          if (o && o.material && o.material.color) {
            o.material.color.lerp(tint, 0.25);
          }
        });
      } catch (_) {}
    }
  } catch (_) {}
}

/* Spawn state moved to spawner module */
let __adaptNextT = 0; // Next time to check adaptive performance






/* Enemies container (initial spawn occurs after villages are created) */
const enemies = [];
/* Dynamic spawner instance declared later after villages are created */
let spawner = null;

/**
 * Legacy function for map changes — now delegates to spawner
 */
function adjustEnemyCountForCurrentMap() {
  try {
    spawner && spawner.adjustForMapChange();
  } catch (_) {}
}
try { window.adjustEnemyCountForMap = adjustEnemyCountForCurrentMap; } catch (_) {}

let selectedUnit = player;

// Village visuals
const houses = [
  (() => { const h = createHouse(); h.position.set(8, 0, -8); scene.add(h); return h; })(),
  (() => { const h = createHouse(); h.position.set(-10, 0, 10); scene.add(h); return h; })(),
  (() => { const h = createHouse(); h.position.set(-16, 0, -12); scene.add(h); return h; })(),
];

const fenceGroup = createVillageFence(VILLAGE_POS, REST_RADIUS, COLOR);
scene.add(fenceGroup);

// Portals/Recall
const portals = initPortals(scene);
// Init Mark cooldown UI after portals are created
const disposeMarkCooldownUI = wireMarkCooldownUI({ btnMark, portals, intervalMs: 500 });
try { window.__disposeMarkCooldownUI = disposeMarkCooldownUI; } catch (_) {}
// Villages system (dynamic villages, roads, rest)
const villages = createVillagesSystem(scene, portals);

/* Dynamic enemy spawner: initialize after villages so it can avoid village radii */
spawner = createDynamicSpawner({
  scene,
  player,
  enemies,
  mapManager,
  villages,
  WORLD,
  EnemyClass: Enemy,
  now,
  distance2D,
  VILLAGE_POS,
  REST_RADIUS,
  renderQuality,
  applyMapModifiersToEnemy
});
spawner.initialSpawn();

// Enemies System (AI, movement, attacks, respawn, billboarding, mobile culling)
const enemiesSystem = createEnemiesSystem({
  THREE,
  WORLD,
  VILLAGE_POS,
  REST_RADIUS,
  dir2D,
  distance2D,
  now,
  audio,
  effects,
  scene,
  player,
  enemies,
  villages,
  mapManager,
  isMobile,
  MOBILE_OPTIMIZATIONS,
  camera,
  shouldSpawnVfx,
  applyMapModifiersToEnemy
});

// ------------------------------------------------------------
// Skills system (cooldowns, abilities, storms) and UI
// ------------------------------------------------------------
const skills = new SkillsSystem(player, enemies, effects, ui.getCooldownElements(), villages);
try { window.__skillsRef = skills; player.skills = skills; } catch (_) {}
try { initHeroPreview(skills, { heroScreen }); } catch (_) {}

// Touch controls (joystick + skill wheel)
const touch = initTouchControls({ player, skills, effects, aimPreview, attackPreview, enemies, getNearestEnemy, WORLD, SKILLS });

// ------------------------------------------------------------
// Raycasting
// ------------------------------------------------------------
/* Maintain a cached list of alive enemy meshes and refresh periodically to avoid
   allocating/filtering every frame when raycasting. This reduces GC and CPU work.
*/
const __enemyMeshes = [];
function __refreshEnemyMeshes() {
  try {
    __enemyMeshes.length = 0;
    for (const en of enemies) {
      if (en.alive) __enemyMeshes.push(en.mesh);
    }
  } catch (_) {}
}
__refreshEnemyMeshes();
try { clearInterval(window.__enemyMeshRefreshInt); } catch (_) {}
window.__enemyMeshRefreshInt = setInterval(__refreshEnemyMeshes, 200);

const raycast = createRaycast({
  renderer,
  camera,
  ground,
  enemiesMeshesProvider: () => __enemyMeshes,
  playerMesh: player.mesh,
});

const inputService = createInputService({
  renderer,
  raycast,
  camera,
  portals,
  player,
  enemies,
  effects,
  skills,
  WORLD,
  aimPreview,
  attackPreview,
  setCenterMsg,
  clearCenterMsg,
});
inputService.attachCaptureListeners();
if (typeof touch !== "undefined" && touch) inputService.setTouchAdapter(touch);

// ------------------------------------------------------------
// UI: cooldowns are updated by skills; HUD and minimap updated in loop
// ------------------------------------------------------------

// ------------------------------------------------------------
// Input Handling
// ------------------------------------------------------------










// ------------------------------------------------------------
// Systems Update Loop
// ------------------------------------------------------------
let lastMoveDir = new THREE.Vector3(0, 0, 0);
let lastT = now();

// Mobile: Much more aggressive AI and billboard throttling
let __aiStride = renderQuality === "low" ? 3 : (renderQuality === "medium" ? 2 : 1);
if (isMobile) {
  __aiStride = Math.ceil(__aiStride * MOBILE_OPTIMIZATIONS.aiStrideMultiplier);
}
const __MOVE_PING_INTERVAL = 0.3; // seconds between continuous move pings (joystick/arrow). Match right-click cadence.
let __joyContPingT = 0;
let __arrowContPingT = 0;
let __arrowWasActive = false;
let __bbStride = renderQuality === "high" ? 2 : 3;
if (isMobile) {
  __bbStride = Math.max(5, __bbStride + 2); // Much less frequent updates
}
let __bbOffset = 0;


if (isMobile) {
  console.info(`[Mobile] AI stride: ${__aiStride}, Billboard stride: ${__bbStride}, Cull distance: ${MOBILE_OPTIMIZATIONS.cullDistance}m`);
}

/* Delegate wrappers to PlayerSystem */
const updatePlayerWrapper = (dt) => playerSystem.updatePlayer(dt, { player, lastMoveDir });
const stopPlayerLocal = () => playerSystem.stopPlayer(player, aimPreview, attackPreview);

function animate() {
  requestAnimationFrame(animate);
  const t = now();
  const dt = Math.min(0.05, t - lastT);
  lastT = t;

  // Frame time budget guard to avoid long rAF hitches (tune via window.__FRAME_BUDGET_MS)
  const __frameStartMs = performance.now();
  const __frameBudgetMs = window.__FRAME_BUDGET_MS || (isMobile ? MOBILE_OPTIMIZATIONS.frameBudgetMs : 10.0);
  const __overBudget = () => (performance.now() - __frameStartMs) > __frameBudgetMs;

  // Unified input (Hexagonal service): movement, holds, skills
  inputService.update(t, dt);

  // Mobile joystick movement (touch controls)
  try {
    if (typeof touch !== "undefined" && touch) {
      const joy = touch.getMoveDir?.();
      if (joy && joy.active && !player.frozen && !player.aimMode) {
        const speed = 10; // target distance ahead in world units
        const base = player.pos();
        const px = base.x + joy.x * speed;
        const pz = base.z + joy.y * speed;
        player.moveTarget = new THREE.Vector3(px, 0, pz);
        player.attackMove = false;
        player.target = null;

        // Continuous move ping while joystick held; match right-click indicator exactly
        try {
          const tnow = now();
          if (!__joyContPingT || tnow >= __joyContPingT) {
            effects.spawnMovePing(new THREE.Vector3(px, 0, pz));
            __joyContPingT = tnow + __MOVE_PING_INTERVAL;
          }
        } catch (e) {}
      } else {
        try { __joyContPingT = 0; } catch (_) {}
      }
    }
  } catch (_) {}

  // Continuous move pings for arrow-key movement; match right-click indicator exactly
  try {
    // Prefer the canonical movement state from inputService (capture-phase listeners)
    const ks = inputService && inputService._state ? inputService._state.moveKeys : null;
    let active = false, dx = 0, dy = 0;
    if (ks) {
      dx = (ks.right ? 1 : 0) + (ks.left ? -1 : 0);
      dy = (ks.down ? 1 : 0) + (ks.up ? -1 : 0);
      const len = Math.hypot(dx, dy);
      if (len > 0) { dx /= len; dy /= len; active = true; }
    }

    if (active && !player.frozen && !player.aimMode) {
      const speed = 10;
      const base = player.pos();
      const px = base.x + dx * speed;
      const pz = base.z + dy * speed;

      // Fire immediately on initial press, then cadence
      if (!__arrowWasActive) {
        effects.spawnMovePing(new THREE.Vector3(px, 0, pz));
        __arrowContPingT = t + __MOVE_PING_INTERVAL;
      } else if (!__arrowContPingT || t >= __arrowContPingT) {
        effects.spawnMovePing(new THREE.Vector3(px, 0, pz));
        __arrowContPingT = t + __MOVE_PING_INTERVAL;
      }
      __arrowWasActive = true;
    } else {
      __arrowWasActive = false;
      __arrowContPingT = 0;
    }
  } catch (_) {}

  updatePlayerWrapper(dt);
  enemiesSystem.update(dt, { aiStride: __aiStride, bbStride: __bbStride, bbOffset: __bbOffset });
  
  // Dynamic enemy spawning system
  try { spawner && spawner.update(dt); } catch (e) { console.warn("Dynamic spawn error:", e); }
  
  if (firstPerson && typeof player !== "undefined") {
    // Reuse temp vectors to avoid per-frame allocations in the FP hand code.
    // left/right are aliases into the shared pool (copied into mid when needed).
    const ud = player.mesh.userData || {};
    const left = __tempVecA;
    const right = __tempVecB;
    left.set(0, 0, 0);
    right.set(0, 0, 0);
    if (ud.leftHandAnchor && ud.handAnchor) {
      // getWorldPosition writes into the provided vector
      ud.leftHandAnchor.getWorldPosition(left);
      ud.handAnchor.getWorldPosition(right);
    } else {
      const p = player.pos();
      // single branch covers both handAnchor variants with identical offsets
      left.set(p.x - 0.4, p.y + 1.15, p.z + 0.25);
      right.set(p.x + 0.4, p.y + 1.15, p.z + 0.25);
    }

    // Midpoint between hands, and forward vector from player orientation
    // mid stored in __tempVecC (copied from left/right), forward reuses __tempVecA
    const mid = __tempVecC.copy(left).add(right).multiplyScalar(0.5);
    const forward = __tempVecA.set(0, 0, 1).applyQuaternion(player.mesh.quaternion).normalize();

    // FP hand VFX and gestures (two hands, fire-in-hand, move/attack animations)
    try {
      const ud2 = player.mesh.userData || {};
      const speed = lastMoveDir.length();
      const tnow = now();

      // Movement/idle crackle scheduling around hands
      if (!ud2.nextCrackleT || tnow >= ud2.nextCrackleT) {
        const strength = 0.6 + speed * 2.0;
        effects.spawnHandCrackle(player, false, strength);
        effects.spawnHandCrackle(player, true, strength * 0.8);
        ud2.nextCrackleT = tnow + (speed > 0.1 ? 0.18 + Math.random() * 0.2 : 0.55 + Math.random() * 0.35);
      }

      // Boost orb/light intensity based on movement and a small flicker
      const flick = Math.sin(tnow * 10) * 0.2;
      if (ud2.fireOrb && ud2.fireOrb.material) {
        ud2.fireOrb.material.emissiveIntensity = 2.1 + speed * 0.6 + flick;
      }
      if (ud2.leftFireOrb && ud2.leftFireOrb.material) {
        ud2.leftFireOrb.material.emissiveIntensity = 1.9 + speed * 0.5 + flick * 0.8;
      }
      if (ud2.handLight) ud2.handLight.intensity = 1.2 + speed * 0.8;
      if (ud2.leftHandLight) ud2.leftHandLight.intensity = 1.0 + speed * 0.7;

      // Randomized gesture wobble while moving or idle, plus brace lift when attacking
      const rArm = ud2.rightArm, lArm = ud2.leftArm;
      if (rArm && lArm) {
        const moveAmp = 0.12 * Math.min(1, speed * 3);
        const idleAmp = 0.06;
        const phase = tnow * 6 + Math.random() * 0.05; // slight desync
        const amp = (speed > 0.02 ? moveAmp : idleAmp);
        const braceN = player.braceUntil && tnow < player.braceUntil ? Math.max(0, (player.braceUntil - tnow) / 0.18) : 0;

        // Base pose + sinusoidal bob + brace squash
        rArm.rotation.x = -Math.PI * 0.12 + Math.sin(phase) * amp - braceN * 0.15;
        lArm.rotation.x =  Math.PI * 0.12 + Math.cos(phase) * amp - braceN * 0.12;

        // Subtle sway and random micro-gestures
        rArm.rotation.y = 0.02 + Math.sin(phase * 0.5) * amp * 0.5 + (Math.random() - 0.5) * 0.01;
        lArm.rotation.y = -0.02 + Math.cos(phase * 0.5) * amp * 0.5 + (Math.random() - 0.5) * 0.01;

        // Occasional quick gesture twitch
        if (!ud2.nextGestureT || tnow >= ud2.nextGestureT) {
          rArm.rotation.z += (Math.random() - 0.5) * 0.08;
          lArm.rotation.z += (Math.random() - 0.5) * 0.08;
          ud2.nextGestureT = tnow + 0.35 + Math.random() * 0.5;
        }
      }
    } catch (e) {}

    // Position camera slightly behind the hands (negative forward)
    // and bias framing so the visible model sits near the center-bottom of the screen
    const fpBack = 4.5;      // match pre-refactor feel (further behind the hands)
    const fpUp = 2.0;        // minimal vertical raise of camera to avoid occlusion
    const fpLookAhead = 3.0;  // look further ahead so enemies occupy the center
    const fpLookUp = 1.1;     // tilt camera upward more so hands/model sit lower in the frame

    // Compute desired camera position and look target without aliasing pooled vectors.
    // desiredPos -> __tempVecB, mid in __tempVecC, forward in __tempVecA
    __tempVecB.copy(mid).addScaledVector(forward, -fpBack);
    __tempVecB.y += fpUp;
    camera.position.lerp(__tempVecB, 1 - Math.pow(0.001, dt));

    // lookTarget -> reuse __tempVecB after lerp
    const lookTarget = __tempVecB.copy(mid).addScaledVector(forward, fpLookAhead);
    lookTarget.y += fpLookUp;
    camera.lookAt(lookTarget);
  } else {
    updateCamera(camera, player, lastMoveDir, dt, cameraOffset, cameraShake);
  }
  updateGridFollow(ground, player);
  if (env) updateEnvironmentFollow(env, player);
  if (chunkMgr) { try { chunkMgr.update(player.pos()); } catch (_) {} }

  // Throttle HUD and minimap updates to reduce main-thread DOM work on low-end devices.
  // HUD_UPDATE_MS / MINIMAP_UPDATE_MS are configured near the top of this file and exposed for tuning.
  try {
    const nowMs = performance.now();
    // HUD
    try {
      if (!window.__lastHudT) window.__lastHudT = 0;
      if ((nowMs - window.__lastHudT) >= (window.__HUD_UPDATE_MS || HUD_UPDATE_MS)) {
        window.__lastHudT = nowMs;
        try { ui.updateHUD(player); } catch (_) {}
      }
    } catch (_) {}
    // MINIMAP
    try {
      if (!window.__lastMinimapT) window.__lastMinimapT = 0;
      if ((nowMs - window.__lastMinimapT) >= (window.__MINIMAP_UPDATE_MS || MINIMAP_UPDATE_MS)) {
        window.__lastMinimapT = nowMs;
        try { ui.updateMinimap(player, enemies, portals, villages); } catch (_) {}
      }
    } catch (_) {}
  } catch (_) {
    // Fallback: if anything goes wrong, keep original per-frame updates to preserve behavior.
    try { ui.updateHUD(player); } catch (_) {}
    try { ui.updateMinimap(player, enemies, portals, villages); } catch (_) {}
  }

  skills.update(t, dt, cameraShake);
  effects.update(t, dt);
  if (env && typeof env.update === "function") env.update(t, dt);

  // Stream world features: ensure far village(s) exist as player travels
  // Throttle world streaming to avoid per-frame overhead and hitching
  if (!window.__lastVillageStreamT) window.__lastVillageStreamT = 0;
  const __nowMs = performance.now();
  if ((__nowMs - window.__lastVillageStreamT) >= (window.__VILLAGE_STREAM_MS || 150)) {
    try { villages.ensureFarVillage(player.pos()); } catch (_) {}
    try { villages.updateVisitedVillage(player.pos()); } catch (_) {}
    window.__lastVillageStreamT = __nowMs;
  }
  // When entering a village, connect it to previous visited village with a road

  if (!__overBudget()) {
    indicators.update(dt, { now, player, enemies, selectedUnit });
    portals.update(dt);
    villages.updateRest(player, dt);
    updateDeathRespawn();
  }

  if (!__overBudget()) {
    __bbOffset = (__bbOffset + 1) % __bbStride;
  }

  if (!__overBudget()) {
    // Update hero overhead bars and billboard to camera
    if (heroBars) {
      const hpRatio = clamp01(player.hp / player.maxHP);
      const mpRatio = clamp01(player.mp / player.maxMP);
      heroBars.hpFill.scale.x = Math.max(0.001, hpRatio);
      heroBars.mpFill.scale.x = Math.max(0.001, mpRatio);
      heroBars.container.lookAt(camera.position);
    }
  }

  renderer.render(scene, camera);

  try {
    if (!window.__gameRenderReadyDispatched) {
      window.__gameRenderReadyDispatched = true;
      try {
        const c = renderer && renderer.domElement;
        if (c) {
          try { c.style.opacity = "1"; } catch (_) {}
        }
      } catch (_) {}
      try { window.dispatchEvent(new Event("game-render-ready")); } catch (_) {}
    }
  } catch (_) {}

  // Update perf metrics (throttled)
  try {
    __computePerf(performance.now());
    // Throttle heavy renderer.info snapshotting / perf exposure to reduce cost.
    // Tunable at runtime via window.__PERF_INFO_THROTTLE_MS (default 1000ms).
    const PERF_INFO_THROTTLE_MS = window.__PERF_INFO_THROTTLE_MS || 1000;
    if (!window.__lastPerfInfoT) window.__lastPerfInfoT = 0;
    const nowPerfT = performance.now();
    if ((nowPerfT - window.__lastPerfInfoT) >= PERF_INFO_THROTTLE_MS) {
      window.__lastPerfInfoT = nowPerfT;
      try { window.__perfMetrics = getPerf(); } catch (_) {}
    }
  } catch (_) {}

  // Adaptive performance: adjust AI stride but maintain minimum enemy count
  try {
    if (!__adaptNextT || t >= __adaptNextT) {
      const fps = (perfTracker.getFPS && perfTracker.getFPS()) || 60;
      let scale = spawner ? spawner.getPerformanceScale() : 1.0;
      if (fps < 25) {
        // Increase AI throttling instead of reducing enemy count
        __aiStride = Math.min(8, (__aiStride || 1) + 1);
        // Only slightly reduce performance scale, minimum of 1.0 to keep ~50 enemies
        scale = Math.max(1.0, scale - 0.05);
      } else if (fps > 50) {
        __aiStride = Math.max(1, (__aiStride || 1) - 1);
        scale = Math.min(1.2, scale + 0.05);
      }
      spawner && spawner.setPerformanceScale(scale);
      __adaptNextT = t + 1.5;
    }
  } catch (_) {}
}

animate();

// ------------------------------------------------------------
// Helpers and per-system updates
// ------------------------------------------------------------






function updateDeathRespawn() {
  const t = now();
  if (!player.alive && player.deadUntil && t >= player.deadUntil) {
    // Respawn at village
    player.alive = true;
    player.mesh.visible = true;
    player.mesh.position.copy(VILLAGE_POS).add(new THREE.Vector3(1.5, 0, 0));
    player.hp = player.maxHP;
    player.mp = player.maxMP;
    player.moveTarget = null;
    player.target = null;
    player.invulnUntil = now() + 2;
    clearCenterMsg();
  }
}

// ------------------------------------------------------------
// Window resize
// ------------------------------------------------------------
addResizeHandler(renderer, camera);

// ------------------------------------------------------------
// Align player start facing village center
// ------------------------------------------------------------
(function initFace() {
  const v = dir2D(player.pos(), VILLAGE_POS);
  const yaw = Math.atan2(v.x, v.z);
  player.mesh.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
})();

// ------------------------------------------------------------
// Guide overlay wiring (modular version)
// ------------------------------------------------------------
try { window.startInstructionGuide = startInstructionGuideOverlay; } catch (_) {}
