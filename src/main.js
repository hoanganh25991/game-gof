// GoF RPG — Fully Refactored with Class-Based Architecture
// All systems now use proper class boundaries with dependency injection

import * as THREE from "../vendor/three/build/three.module.js";
import { COLOR, WORLD, VILLAGE_POS, REST_RADIUS, SCALING, storageKey, CSS_READY } from "./constants.js";
import { setLoadoutAndApply, getSkill, setSkill } from "./skill_api.js";
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
import { SKILLS_POOL, DEFAULT_LOADOUT } from "./skills_pool.js";
import { loadOrDefault, saveLoadout, resolveLoadout } from "./loadout.js";
import { audio } from "./audio.js";
import { createVillagesSystem } from "./villages.js";
import { createMapManager, applyMapEnemyCss } from "./maps.js";
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
import { getStructureProtectionRadius } from "./structures.js";
import { isMobile, MOBILE_OPTIMIZATIONS, applyMobileRendererHints } from "./config/mobile.js";
import { createDynamicSpawner } from "./spawn.js";
import { createVillageFence } from "./village_fence.js";
import { createPerformanceTracker, initVfxGating } from "./perf.js";
import { createIndicators } from "./ui/indicators.js";
import { wireUIBindings } from "./ui/bindings.js";
import { wireMarkCooldownUI } from "./ui/mark_cooldown.js";
import { wireTopBar } from "./ui/topbar.js";
import { createRespawnSystem } from "./respawn_system.js";

// NEW: Import refactored class-based systems and managers
import { CameraSystem } from "./camera_system.js";
import { PlayerSystem } from "./player_system.js";
import { EnemiesSystem } from "./enemies_system.js";
import { BuffManager } from "./managers/BuffManager.js";
import { ProximityManager } from "./managers/ProximityManager.js";
import { UIController } from "./managers/UIController.js";
import { SettingsManager } from "./managers/SettingsManager.js";
import { WorldManager } from "./core/WorldManager.js";
import { GameLoop } from "./core/GameLoop.js";

await CSS_READY;

// ============================================================
// INITIALIZATION: Settings, World, UI
// ============================================================

// Initialize settings manager (replaces scattered localStorage code)
const settingsManager = new SettingsManager({ storageKey, isMobile, MOBILE_OPTIMIZATIONS });

// Initialize world manager
const worldManager = new WorldManager({ initWorld, updateCamera, updateGridFollow, addResizeHandler });
const { renderer, scene, camera, ground, cameraOffset, cameraShake } = worldManager.getWorld();

// Apply mobile renderer optimizations
applyMobileRendererHints(renderer);

// Get settings from manager
const renderQuality = settingsManager.getRenderQuality();

// UI Manager
const ui = new UIManager();

// Effects and other systems
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
try { applyMapEnemyCss(mapManager.getModifiers()); } catch (_) {}

let chunkMgr = null;
const WORLD_SEED = getOrInitWorldSeed();

// Performance tracker
const perfTracker = createPerformanceTracker(renderer, { targetFPS: 90, autoAdjust: true });

// VFX gating
const shouldSpawnVfx = initVfxGating({
  camera,
  isMobile,
  mobileOpts: MOBILE_OPTIMIZATIONS,
  initialQuality: renderQuality,
  tracker: perfTracker
});

function getPerf() {
  try { return perfTracker.getPerf(); } catch (_) { return { fps: 0, fpsLow1: 0, ms: 0, avgMs: 0 }; }
}

// ============================================================
// ENVIRONMENT SETUP
// ============================================================

const envSettings = settingsManager.getEnvironmentSettings();
let envRainState = envSettings.rain;
let envDensityIndex = envSettings.density;
let envRainLevel = envSettings.rainLevel;

const ENV_PRESETS = [
  { treeCount: 20, rockCount: 10, flowerCount: 60, villageCount: 1 },
  { treeCount: 60, rockCount: 30, flowerCount: 120, villageCount: 1 },
  { treeCount: 140, rockCount: 80, flowerCount: 300, villageCount: 2 },
];

let envPreset = ENV_PRESETS[envDensityIndex];
if (isMobile) {
  const reduction = MOBILE_OPTIMIZATIONS.envDensityReduction;
  envPreset = {
    treeCount: Math.floor(envPreset.treeCount * reduction),
    rockCount: Math.floor(envPreset.rockCount * reduction),
    flowerCount: Math.floor(envPreset.flowerCount * reduction),
    villageCount: envPreset.villageCount,
  };
  if (MOBILE_OPTIMIZATIONS.disableRain) {
    envRainState = false;
  }
}

let env = null;
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
    envPreset = Object.assign({}, envPreset, { treeCount: 0, rockCount: 0, flowerCount: 0 });
  } catch (e) {
    console.warn("[Chunking] init failed:", e);
    chunkMgr = null;
  }
}

env = await initEnvironment(scene, Object.assign({}, envPreset, { enableRain: envRainState, quality: renderQuality, seed: WORLD_SEED }));
try {
  if (envRainState && env && typeof env.setRainLevel === "function") {
    env.setRainLevel(envRainLevel);
  }
} catch (_) {}

// ============================================================
// SPLASH, I18N, PAYMENTS
// ============================================================

initSplash();
initI18n();
setupDesktopControls();
initPaymentsBootstrap({ payments, storageKey });

// ============================================================
// AUDIO SETUP (using SettingsManager)
// ============================================================

audio.startOnFirstUserGesture(document);
const sfxEnabled = settingsManager.isSfxEnabled();
const musicEnabled = settingsManager.isMusicEnabled();
try { audio.setSfxVolume(sfxEnabled ? 0.5 : 0.0); } catch (_) {}

const __startMusicOnce = (ev) => {
  if (!musicEnabled) return;
  try {
    audio.ensureBackgroundMusic("audio/earth-space-music-313081.mp3", { volume: 0.35, loop: true });
  } catch (e) {
    try { audio.setMusicVolume(0.35); audio.startMusic(); } catch (_) {}
  } finally {
    try {
      document.removeEventListener("click", __startMusicOnce, true);
      document.removeEventListener("touchstart", __startMusicOnce, true);
      document.removeEventListener("keydown", __startMusicOnce, true);
    } catch (_) {}
  }
};

if (musicEnabled) {
  document.addEventListener("click", __startMusicOnce, true);
  document.addEventListener("touchstart", __startMusicOnce, true);
  document.addEventListener("keydown", __startMusicOnce, true);
}

// ============================================================
// UI ELEMENTS & SETTINGS
// ============================================================

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

let portals = null;
try {
  portals = initPortals(scene);
} catch (e) {
  console.warn("[PORTALS] init failed:", e);
  portals = null;
}

// Settings screen setup
const audioCtl = {
  audio,
  getMusicEnabled: () => settingsManager.isMusicEnabled(),
  setMusicEnabled: (v) => {
    settingsManager.setMusicEnabled(v);
    if (v && !audio.isPlaying()) {
      audio.ensureBackgroundMusic("audio/earth-space-music-313081.mp3", { volume: 0.35, loop: true });
    } else if (!v) {
      audio.stopMusic();
    }
  },
  getSfxEnabled: () => settingsManager.isSfxEnabled(),
  setSfxEnabled: (v) => {
    settingsManager.setSfxEnabled(v);
    audio.setSfxVolume(v ? 0.5 : 0.0);
  },
};

const environmentCtx = {
  scene,
  ENV_PRESETS,
  initEnvironment,
  updateEnvironmentFollow,
  get player() { return player; },
  getState: () => ({ 
    env, 
    envRainState: settingsManager.isRainEnabled(), 
    envDensityIndex: settingsManager.getEnvironmentDensity(), 
    envRainLevel: settingsManager.getRainLevel() 
  }),
  setState: (st) => {
    env = st.env ?? env;
    if (typeof st.envRainState === 'boolean') settingsManager.setRainEnabled(st.envRainState);
    if (typeof st.envDensityIndex === 'number') settingsManager.setEnvironmentDensity(st.envDensityIndex);
    if (typeof st.envRainLevel === 'number') settingsManager.setRainLevel(st.envRainLevel);
  },
};

const renderCtx = {
  renderer,
  cameraOffset,
  baseCameraOffset: worldManager.getBaseCameraOffset(),
  getQuality: () => settingsManager.getRenderQuality(),
  setQuality: (q) => settingsManager.setRenderQuality(q),
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

// Wire restore purchases button
(function wireRestoreButton() {
  const btn = document.getElementById('btnRestorePurchases');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      btn.disabled = true;
      ui.setCenterMsg('Checking purchases...');
      const res = await window.restorePurchases();
      if (Array.isArray(res)) {
        if (res.length > 0 || window.__appPurchased) {
          ui.setCenterMsg('Purchase restored.');
        } else {
          ui.setCenterMsg('No purchases found.');
        }
      } else if (res && res.ok && res.note) {
        ui.setCenterMsg('Requested license status; awaiting response...');
      } else {
        if (window.__appPurchased) {
          ui.setCenterMsg('Purchase restored.');
        } else {
          ui.setCenterMsg('No purchase found.');
        }
      }
      setTimeout(() => { try { ui.clearCenterMsg(); } catch (_) {} }, 1400);
    } catch (err) {
      console.warn('[UI] restorePurchases click failed', err);
      try { ui.setCenterMsg('Restore failed'); } catch (_) {}
      setTimeout(() => { try { ui.clearCenterMsg(); } catch (_) {} }, 1400);
    } finally {
      try { btn.disabled = false; } catch (_) {}
    }
  });
})();

// ============================================================
// ENTITIES & GAME STATE
// ============================================================

const player = new Player();
scene.add(player.mesh);
try { updateEnvironmentFollow(env, player); } catch (e) {}

// Map unlock
try {
  mapManager.unlockByLevel(player.level);
  window.addEventListener("player-levelup", (ev) => {
    try {
      const lvl = ev?.detail?.level || player.level;
      const unlockedChanged = mapManager.unlockByLevel(lvl);
      if (unlockedChanged) {
        const prevIdx = mapManager.getCurrentIndex?.() || 1;
        const maxIdx = mapManager.getUnlockedMax?.() || prevIdx;
        if (maxIdx > prevIdx) {
          if (mapManager.setCurrent?.(maxIdx)) {
            enemies.forEach((en) => applyMapModifiersToEnemy(en));
            try { adjustEnemyCountForCurrentMap(); } catch (_) {}
            ui.setCenterMsg(`Unlocked and switched to MAP ${maxIdx}`);
            setTimeout(() => ui.clearCenterMsg(), 1400);
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
    try { adjustEnemyCountForCurrentMap(); } catch (_) {}
  }); 
} catch (_) {}

const heroBars = createHeroOverheadBars();
player.mesh.add(heroBars.container);

player.onDeath = () => {
  player.deadUntil = now() + 3;
  ui.setCenterMsg(t("death.msg"));
  player.aimMode = false;
  player.aimModeSkill = null;
  player.moveTarget = null;
  player.target = null;
};

const respawnSystem = createRespawnSystem({ 
  THREE, 
  now, 
  VILLAGE_POS, 
  setCenterMsg: (t) => ui.setCenterMsg(t), 
  clearCenterMsg: () => ui.clearCenterMsg(), 
  player 
});

// Map modifiers helper
function applyMapModifiersToEnemy(en) {
  try {
    const mods = mapManager.getModifiers?.() || {};
    const hpRatio = en.maxHP > 0 ? (en.hp / en.maxHP) : 1;
    en.maxHP = Math.max(1, Math.floor(en.maxHP * (mods.enemyHpMul || 1)));
    en.hp = Math.max(1, Math.floor(en.maxHP * hpRatio));
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

// Enemies container
const enemies = [];
let spawner = null;

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

const disposeMarkCooldownUI = wireMarkCooldownUI({ btnMark, portals, intervalMs: 500 });
try { window.__disposeMarkCooldownUI = disposeMarkCooldownUI; } catch (_) {}

const villages = createVillagesSystem(scene, portals);

// Gather villa structures
const villaStructures = [];
try {
  scene.traverse((o) => {
    try {
      if (o && o.userData && o.userData.structure === "villa") {
        const center = (o.userData && o.userData.center) ? o.userData.center.clone() : (o.position ? o.position.clone() : null);
        const radius = (o.userData && o.userData.radius) ? o.userData.radius : 6;
        if (center) villaStructures.push({ obj: o, center, radius });
      }
    } catch (_) {}
  });
} catch (_) {}

// Dynamic spawner
spawner = createDynamicSpawner({
  scene, player, enemies, mapManager, villages, WORLD,
  EnemyClass: Enemy, now, distance2D, VILLAGE_POS, REST_RADIUS,
  renderQuality, applyMapModifiersToEnemy, chunkMgr
});
spawner.initialSpawn();

// ============================================================
// NEW: Initialize Refactored Managers
// ============================================================

// UI Controller (replaces scattered UI update code)
const uiController = new UIController({
  ui,
  player,
  heroBars,
  camera,
  clamp01,
  isMobile,
  MOBILE_OPTIMIZATIONS
});

// Buff Manager (replaces all buff functions)
const buffManager = new BuffManager({
  THREE,
  player,
  setCenterMsg: (msg) => uiController.setCenterMsg(msg),
  clearCenterMsg: () => uiController.clearCenterMsg()
});

// Proximity Manager (replaces proximity check functions)
const proximityManager = new ProximityManager({
  player,
  chunkMgr,
  villaStructures,
  buffManager,
  setCenterMsg: (msg) => uiController.setCenterMsg(msg),
  clearCenterMsg: () => uiController.clearCenterMsg(),
  getStructureProtectionRadius
});

// Wire village buff events to BuffManager
window.addEventListener('village-enter', () => buffManager.applyVillageBuff());
window.addEventListener('village-leave', () => buffManager.removeVillageBuff());

// Systems
const cameraSystem = new CameraSystem({ THREE, now, effects });
const playerSystem = new PlayerSystem({ THREE, now, dir2D, distance2D, WORLD, renderer });
const enemiesSystem = new EnemiesSystem({
  THREE, WORLD, VILLAGE_POS, REST_RADIUS,
  dir2D, distance2D, now, audio, effects,
  scene, player, enemies, villages, mapManager,
  isMobile, MOBILE_OPTIMIZATIONS, camera,
  shouldSpawnVfx, applyMapModifiersToEnemy, chunkMgr
});

// ============================================================
// SKILLS, INPUT, LOADOUT
// ============================================================

const skills = new SkillsSystem(player, enemies, effects, ui.getCooldownElements(), villages);
try { window.__skillsRef = skills; player.skills = skills; } catch (_) {}
try { initHeroPreview(skills, { heroScreen }); } catch (_) {}

const touch = initTouchControls({ player, skills, effects, aimPreview: null, attackPreview: null, enemies, getNearestEnemy, WORLD, skillApi: { getSkill, setSkill } });

let currentLoadout = loadOrDefault(SKILLS_POOL, DEFAULT_LOADOUT);

function applyLoadoutToSKILLS(loadoutIds) {
  setLoadoutAndApply(loadoutIds, {
    upgradeMapper: (id, base) => {
      try {
        const mgr = getSkillUpgradeManager();
        return mgr ? mgr.applyUpgradeBonuses(id, base) : base;
      } catch (_) { return base; }
    }
  });
}

function setLoadoutAndSave(ids) {
  const resolved = resolveLoadout(SKILLS_POOL, ids, DEFAULT_LOADOUT);
  currentLoadout = resolved;
  setLoadoutAndApply(currentLoadout, {
    upgradeMapper: (id, base) => {
      try {
        const mgr = getSkillUpgradeManager();
        return mgr ? mgr.applyUpgradeBonuses(id, base) : base;
      } catch (_) { return base; }
    }
  });
  saveLoadout(currentLoadout);
  updateSkillBarLabels();
}

setLoadoutAndApply(currentLoadout, {
  upgradeMapper: (id, base) => {
    try {
      const mgr = getSkillUpgradeManager();
      return mgr ? mgr.applyUpgradeBonuses(id, base) : base;
    } catch (_) { return base; }
  }
});
updateSkillBarLabels();
try { window.updateSkillBarLabels = updateSkillBarLabels; } catch (e) {}

window.addEventListener("loadout-changed", () => {
  try {
    currentLoadout = loadOrDefault(SKILLS_POOL, DEFAULT_LOADOUT);
    applyLoadoutToSKILLS(currentLoadout);
    updateSkillBarLabels();
    if (skills && typeof skills.refreshSkills === 'function') {
      skills.refreshSkills();
    }
  } catch (_) {}
});

// Hero screen
function showHeroScreen(initialTab = "skills") {
  const ctx = {
    t, player, SKILL_POOL: SKILLS_POOL, DEFAULT_LOADOUT, currentLoadout,
    setLoadoutAndSave, updateSkillBarLabels, mapManager, portals, enemies,
    effects, WORLD, setCenterMsg: (m) => uiController.setCenterMsg(m),
    clearCenterMsg: () => uiController.clearCenterMsg(),
    applyMapModifiersToEnemy, adjustEnemyCountForMap: adjustEnemyCountForCurrentMap,
  };
  try { audio.ensureBackgroundMusic("audio/earth-space-music-313081.mp3", { volume: 0.35, loop: true }); } catch (_) {}
  try { renderHeroScreenUI(initialTab, ctx); } catch (_) {}
}

const disposeTopBar = wireTopBar({
  elements: { btnHeroScreen, heroScreen, btnStart, introScreen, btnCamera, btnPortal, btnMark },
  actions: {
    showHeroScreen: () => showHeroScreen("skills"),
    setFirstPerson: (enabled) => worldManager.setFirstPersonMode(enabled, player, heroBars),
    getFirstPerson: () => worldManager.isFirstPersonMode(),
    portals,
    getPlayer: () => player,
    setCenterMsg: (t) => uiController.setCenterMsg(t),
    clearCenterMsg: () => uiController.clearCenterMsg(),
    startInstructionGuide: startInstructionGuideOverlay
  }
});
try { window.__disposeTopBar = disposeTopBar; } catch (_) {}

wireUIBindings({
  storageKey, scene, getPlayer: () => player, ENV_PRESETS,
  initEnvironment, updateEnvironmentFollow,
  envAccess: { get: () => environmentCtx.getState(), set: (st) => environmentCtx.setState(st) },
  renderQualityRef: { get: () => renderCtx.getQuality(), set: (q) => renderCtx.setQuality(q) },
  cameraOffset, baseCameraOffset: worldManager.getBaseCameraOffset(),
  audioCtl, audio
});

// Raycasting
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
  renderer, camera, ground,
  enemiesMeshesProvider: () => __enemyMeshes,
  playerMesh: player.mesh,
});

const inputService = createInputService({
  renderer, raycast, camera, portals, player, enemies,
  effects, skills, WORLD, aimPreview: null, attackPreview: null,
  setCenterMsg: (t) => uiController.setCenterMsg(t),
  clearCenterMsg: () => uiController.clearCenterMsg(),
});
inputService.attachCaptureListeners();
if (typeof touch !== "undefined" && touch) inputService.setTouchAdapter(touch);

// ============================================================
// GAME LOOP (NEW: Using GameLoop class)
// ============================================================

let lastMoveDir = new THREE.Vector3(0, 0, 0);

// Mobile: AI and billboard throttling
let __aiStride = renderQuality === "low" ? 3 : (renderQuality === "medium" ? 2 : 1);
if (isMobile) {
  __aiStride = Math.ceil(__aiStride * MOBILE_OPTIMIZATIONS.aiStrideMultiplier);
}

const __MOVE_PING_INTERVAL = 0.3;
let __joyContPingT = 0;
let __arrowContPingT = 0;
let __arrowWasActive = false;

let __bbStride = renderQuality === "high" ? 2 : 3;
if (isMobile) {
  __bbStride = Math.max(5, __bbStride + 2);
}
let __bbOffset = 0;
let __adaptNextT = 0;

if (isMobile) {
  console.info(`[Mobile] AI stride: ${__aiStride}, Billboard stride: ${__bbStride}`);
}

const gameLoop = new GameLoop({
  now,
  isMobile,
  MOBILE_OPTIMIZATIONS,
  onUpdate: (dt, t, { isOverBudget }) => {
    // Perf tracking
    try {
      perfTracker.update(performance.now());
      perfTracker.maybeAutoAdjustVfxQuality();
    } catch (_) {}

    // Input
    inputService.update(t, dt);

    // Mobile joystick
    try {
      if (typeof touch !== "undefined" && touch) {
        const joy = touch.getMoveDir?.();
        if (joy && joy.active && !player.frozen && !player.aimMode) {
          const speed = 10;
          const base = player.pos();
          const px = base.x + joy.x * speed;
          const pz = base.z + joy.y * speed;
          player.moveTarget = new THREE.Vector3(px, 0, pz);
          player.attackMove = false;
          player.target = null;

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

    // Arrow key movement
    try {
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

    // Player update
    playerSystem.updatePlayer(dt, { player, lastMoveDir });

    // Enemies update
    enemiesSystem.update(dt, { aiStride: __aiStride, bbStride: __bbStride, bbOffset: __bbOffset });

    // Dynamic spawner
    try { spawner && spawner.update(dt); } catch (e) {}

    // Camera update
    if (worldManager.isFirstPersonMode()) {
      cameraSystem.updateFirstPerson(camera, player, lastMoveDir, dt);
    } else {
      worldManager.updateCameraForPlayer(player, lastMoveDir, dt);
    }

    // Grid and environment follow
    worldManager.updateGridForPlayer(player);
    if (env) updateEnvironmentFollow(env, player);
    if (chunkMgr) { try { chunkMgr.update(player.pos()); } catch (_) {} }

    // UI updates (throttled via UIController)
    uiController.updateHUD();
    uiController.updateMinimap(enemies, portals, villages, chunkMgr);
    uiController.updateHeroBars();

    // Skills, effects, environment
    skills.update(t, dt, cameraShake);
    effects.update(t, dt);
    if (env && typeof env.update === "function") env.update(t, dt);

    // Village streaming (throttled)
    if (!window.__lastVillageStreamT) window.__lastVillageStreamT = 0;
    const __nowMs = performance.now();
    if ((__nowMs - window.__lastVillageStreamT) >= 150) {
      try { villages.ensureFarVillage(player.pos()); } catch (_) {}
      try { villages.updateVisitedVillage(player.pos()); } catch (_) {}
      window.__lastVillageStreamT = __nowMs;
    }

    if (!isOverBudget()) {
      indicators.update(dt, { now, player, enemies, selectedUnit });
      portals.update(dt);
      villages.updateRest(player, dt);

      // Proximity checks (using ProximityManager)
      proximityManager.update();

      respawnSystem.update();
    }

    if (!isOverBudget()) {
      __bbOffset = (__bbOffset + 1) % __bbStride;
    }

    // Render
    renderer.render(scene, camera);

    // Game ready event
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

    // Adaptive performance
    try {
      if (!__adaptNextT || t >= __adaptNextT) {
        const fps = (perfTracker.getFPS && perfTracker.getFPS()) || 60;
        let scale = spawner ? spawner.getPerformanceScale() : 1.0;
        if (fps < 25) {
          __aiStride = Math.min(8, (__aiStride || 1) + 1);
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
});

// Start the game loop
gameLoop.start();

// Window resize
worldManager.handleResize();

// Align player start facing village center
(function initFace() {
  const v = dir2D(player.pos(), VILLAGE_POS);
  const yaw = Math.atan2(v.x, v.z);
  player.mesh.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
})();

// Guide overlay wiring
try { window.startInstructionGuide = startInstructionGuideOverlay; } catch (_) {}
