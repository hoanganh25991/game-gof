/**
 * GameApp - Main application class
 * Encapsulates all game initialization and orchestration logic
 */

import * as THREE from "../../vendor/three/build/three.module.js";
import { COLOR, WORLD, VILLAGE_POS, REST_RADIUS, SCALING, storageKey, CSS_READY } from "../constants.js";
import { setLoadoutAndApply, getSkill, setSkill } from "../skill_api.js";
import { initWorld, updateCamera, updateGridFollow, updateEnvironmentFollow, addResizeHandler, getTargetPixelRatio } from "../world.js";
import { UIManager } from "../ui/hud/index.js";
import { Player, Enemy, getNearestEnemy, handWorldPos } from "../entities.js";
import { EffectsManager, createGroundRing } from "../effects.js";
import { SkillsSystem } from "../skills.js";
import { createRaycast } from "../raycast.js";
import { createHouse, createHeroOverheadBars } from "../meshes.js";
import { initEnvironment } from "../environment.js";
import { distance2D, dir2D, now, clamp01 } from "../utils.js";
import { initPortals } from "../portals.js";
import { initI18n, setLanguage, getLanguage, t } from "../i18n.js";
import { initSplash } from "../splash.js";
import { initTouchControls } from "../touch.js";
import { createInputService } from "../input_service.js";
import { SKILLS_POOL, DEFAULT_LOADOUT } from "../skills_pool.js";
import { loadOrDefault, saveLoadout, resolveLoadout } from "../loadout.js";
import { audio } from "../audio.js";
import { createVillagesSystem } from "../villages.js";
import { createMapManager, applyMapEnemyCss } from "../maps.js";
import { initHeroPreview } from "../ui/hero/preview.js";
import { startInstructionGuide as startInstructionGuideOverlay } from "../ui/guide.js";
import { setupSettingsScreen } from "../ui/settings/index.js";
import { renderHeroScreen as renderHeroScreenUI } from "../ui/hero/index.js";
import { updateSkillBarLabels } from "../ui/icons.js";
import { promptBasicUpliftIfNeeded } from "../uplift.js";
import { setupDesktopControls } from "../ui/deskop-controls.js";
import * as payments from '../payments.js';
import { initPaymentsBootstrap } from "../payments_boot.js";
import { getSkillUpgradeManager } from "../skill_upgrades.js";
import { ChunkManager, getOrInitWorldSeed } from "../chunk_manager.js";
import { getStructureProtectionRadius } from "../structures.js";
import { isMobile, MOBILE_OPTIMIZATIONS, applyMobileRendererHints } from "../config/mobile.js";
import { createDynamicSpawner } from "../spawn.js";
import { createVillageFence } from "../village_fence.js";
import { createPerformanceTracker, initVfxGating } from "../perf.js";
import { createIndicators } from "../ui/indicators.js";
import { wireUIBindings } from "../ui/bindings.js";
import { wireMarkCooldownUI } from "../ui/mark_cooldown.js";
import { wireTopBar } from "../ui/topbar.js";
import { createRespawnSystem } from "../respawn_system.js";

// Refactored managers
import { CameraSystem } from "../camera_system.js";
import { PlayerSystem } from "../player_system.js";
import { EnemiesSystem } from "../enemies_system.js";
import { BuffManager } from "../managers/BuffManager.js";
import { ProximityManager } from "../managers/ProximityManager.js";
import { UIController } from "../managers/UIController.js";
import { SettingsManager } from "../managers/SettingsManager.js";
import { WorldManager } from "./WorldManager.js";
import { GameLoop } from "./GameLoop.js";

export class GameApp {
  // Core managers (using _ prefix for privacy convention)
  _settingsManager;
  _worldManager;
  _uiController;
  _buffManager;
  _proximityManager;
  _gameLoop;

  // World components
  _scene;
  _camera;
  _renderer;
  _ground;
  _cameraOffset;
  _cameraShake;

  // Game systems
  _cameraSystem;
  _playerSystem;
  _enemiesSystem;
  _skillsSystem;
  _inputService;
  _respawnSystem;

  // Game state
  _player;
  _enemies = [];
  _selectedUnit;
  
  // Environment
  _env;
  _chunkMgr;
  _spawner;
  _villages;
  _portals;
  _villaStructures = [];
  
  // UI components
  _ui;
  _heroBars;
  _touch;
  
  // Effects and utilities
  _effects;
  _indicators;
  _mapManager;
  _perfTracker;
  _shouldSpawnVfx;
  
  // Loadout
  _currentLoadout;
  
  // Cleanup functions
  _disposeMarkCooldownUI;
  _disposeTopBar;
  
  // Animation state
  _lastMoveDir = new THREE.Vector3(0, 0, 0);
  _aiStride;
  _bbStride;
  _bbOffset = 0;
  _adaptNextT = 0;
  
  // Movement ping state
  _joyContPingT = 0;
  _arrowContPingT = 0;
  _arrowWasActive = false;
  
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Initialize the entire application
   */
  async init() {
    await CSS_READY;
    
    await this._initSettings();
    await this._initWorld();
    await this._initEnvironment();
    await this._initSplashAndI18n();
    await this._initAudio();
    await this._initUI();
    await this._initEntities();
    await this._initManagers();
    await this._initSystems();
    await this._initSkillsAndInput();
    this._setupGameLoop();
  }

  /**
   * Start the game
   */
  start() {
    this._gameLoop.start();
    
    // Align player start facing village center
    const v = dir2D(this._player.pos(), VILLAGE_POS);
    const yaw = Math.atan2(v.x, v.z);
    this._player.mesh.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
    
    // Expose guide for external access
    try { window.startInstructionGuide = startInstructionGuideOverlay; } catch (_) {}
  }

  // ============================================================
  // INITIALIZATION PHASES
  // ============================================================

  async _initSettings() {
    this._settingsManager = new SettingsManager({ storageKey, isMobile, MOBILE_OPTIMIZATIONS });
  }

  async _initWorld() {
    this._worldManager = new WorldManager({ initWorld, updateCamera, updateGridFollow, addResizeHandler });
    const world = this._worldManager.getWorld();
    this._scene = world.scene;
    this._camera = world.camera;
    this._renderer = world.renderer;
    this._ground = world.ground;
    this._cameraOffset = world.cameraOffset;
    this._cameraShake = world.cameraShake;

    // Apply mobile optimizations
    applyMobileRendererHints(this._renderer);

    // Initialize effects
    const renderQuality = this._settingsManager.getRenderQuality();
    this._effects = new EffectsManager(this._scene, { quality: renderQuality });

    // Initialize performance tracking
    this._perfTracker = createPerformanceTracker(this._renderer, { targetFPS: 90, autoAdjust: true });
    this._shouldSpawnVfx = initVfxGating({
      camera: this._camera,
      isMobile,
      mobileOpts: MOBILE_OPTIMIZATIONS,
      initialQuality: renderQuality,
      tracker: this._perfTracker
    });
  }

  async _initEnvironment() {
    const envSettings = this._settingsManager.getEnvironmentSettings();
    const renderQuality = this._settingsManager.getRenderQuality();
    
    let envRainState = envSettings.rain;
    const envDensityIndex = envSettings.density;
    const envRainLevel = envSettings.rainLevel;

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

    // Initialize chunking if enabled
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
        const WORLD_SEED = getOrInitWorldSeed();
        this._chunkMgr = new ChunkManager(this._scene, {
          chunkSize: size,
          radius: Math.max(1, chunkCfg.radius || 2),
          seed: WORLD_SEED,
          storagePrefix: chunkCfg.storagePrefix || "gof.chunk",
          densities: dens,
        });
        envPreset = Object.assign({}, envPreset, { treeCount: 0, rockCount: 0, flowerCount: 0 });
      } catch (e) {
        console.warn("[Chunking] init failed:", e);
        this._chunkMgr = null;
      }
    }

    const WORLD_SEED = getOrInitWorldSeed();
    this._env = await initEnvironment(
      this._scene, 
      Object.assign({}, envPreset, { 
        enableRain: envRainState, 
        quality: renderQuality, 
        seed: WORLD_SEED 
      })
    );

    try {
      if (envRainState && this._env && typeof this._env.setRainLevel === "function") {
        this._env.setRainLevel(envRainLevel);
      }
    } catch (_) {}
  }

  async _initSplashAndI18n() {
    initSplash();
    initI18n();
    setupDesktopControls();
    initPaymentsBootstrap({ payments, storageKey });
  }

  async _initAudio() {
    audio.startOnFirstUserGesture(document);
    const sfxEnabled = this._settingsManager.isSfxEnabled();
    const musicEnabled = this._settingsManager.isMusicEnabled();
    
    try { audio.setSfxVolume(sfxEnabled ? 0.5 : 0.0); } catch (_) {}

    const startMusicOnce = (ev) => {
      if (!musicEnabled) return;
      try {
        audio.ensureBackgroundMusic("audio/earth-space-music-313081.mp3", { volume: 0.35, loop: true });
      } catch (e) {
        try { audio.setMusicVolume(0.35); audio.startMusic(); } catch (_) {}
      } finally {
        try {
          document.removeEventListener("click", startMusicOnce, true);
          document.removeEventListener("touchstart", startMusicOnce, true);
          document.removeEventListener("keydown", startMusicOnce, true);
        } catch (_) {}
      }
    };

    if (musicEnabled) {
      document.addEventListener("click", startMusicOnce, true);
      document.addEventListener("touchstart", startMusicOnce, true);
      document.addEventListener("keydown", startMusicOnce, true);
    }
  }

  async _initUI() {
    this._ui = new UIManager();
    
    this._indicators = createIndicators({
      effects: this._effects,
      COLOR,
      createGroundRing,
      isMobile,
      MOBILE_OPTIMIZATIONS,
      handWorldPos
    });

    this._mapManager = createMapManager();
    try { applyMapEnemyCss(this._mapManager.getModifiers()); } catch (_) {}

    // Setup settings screen
    this._setupSettingsScreen();
  }

  _setupSettingsScreen() {
    const btnSettingsScreen = document.getElementById("btnSettingsScreen");
    const btnCloseSettings = document.getElementById("btnCloseSettings");
    const settingsPanel = document.getElementById("settingsPanel");

    const audioCtl = {
      audio,
      getMusicEnabled: () => this._settingsManager.isMusicEnabled(),
      setMusicEnabled: (v) => {
        this._settingsManager.setMusicEnabled(v);
        if (v && !audio.isPlaying()) {
          audio.ensureBackgroundMusic("audio/earth-space-music-313081.mp3", { volume: 0.35, loop: true });
        } else if (!v) {
          audio.stopMusic();
        }
      },
      getSfxEnabled: () => this._settingsManager.isSfxEnabled(),
      setSfxEnabled: (v) => {
        this._settingsManager.setSfxEnabled(v);
        audio.setSfxVolume(v ? 0.5 : 0.0);
      },
    };

    const self = this;
    const environmentCtx = {
      scene: this._scene,
      ENV_PRESETS: [
        { treeCount: 20, rockCount: 10, flowerCount: 60, villageCount: 1 },
        { treeCount: 60, rockCount: 30, flowerCount: 120, villageCount: 1 },
        { treeCount: 140, rockCount: 80, flowerCount: 300, villageCount: 2 },
      ],
      initEnvironment,
      updateEnvironmentFollow,
      get player() { return self._player; },
      getState: () => ({ 
        env: self._env, 
        envRainState: self._settingsManager.isRainEnabled(), 
        envDensityIndex: self._settingsManager.getEnvironmentDensity(), 
        envRainLevel: self._settingsManager.getRainLevel() 
      }),
      setState: (st) => {
        self._env = st.env ?? self._env;
        if (typeof st.envRainState === 'boolean') self._settingsManager.setRainEnabled(st.envRainState);
        if (typeof st.envDensityIndex === 'number') self._settingsManager.setEnvironmentDensity(st.envDensityIndex);
        if (typeof st.envRainLevel === 'number') self._settingsManager.setRainLevel(st.envRainLevel);
      },
    };

    const renderCtx = {
      renderer: this._renderer,
      cameraOffset: this._cameraOffset,
      baseCameraOffset: this._worldManager.getBaseCameraOffset(),
      getQuality: () => this._settingsManager.getRenderQuality(),
      setQuality: (q) => this._settingsManager.setRenderQuality(q),
      getTargetPixelRatio: () => getTargetPixelRatio(),
      getPerf: () => {
        try { return this._perfTracker.getPerf(); } catch (_) { return { fps: 0, fpsLow1: 0, ms: 0, avgMs: 0 }; }
      },
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
    this._wireRestorePurchasesButton();
  }

  _wireRestorePurchasesButton() {
    const btn = document.getElementById('btnRestorePurchases');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try {
        btn.disabled = true;
        this._ui.setCenterMsg('Checking purchases...');
        const res = await window.restorePurchases();
        if (Array.isArray(res)) {
          if (res.length > 0 || window.__appPurchased) {
            this._ui.setCenterMsg('Purchase restored.');
          } else {
            this._ui.setCenterMsg('No purchases found.');
          }
        } else if (res && res.ok && res.note) {
          this._ui.setCenterMsg('Requested license status; awaiting response...');
        } else {
          if (window.__appPurchased) {
            this._ui.setCenterMsg('Purchase restored.');
          } else {
            this._ui.setCenterMsg('No purchase found.');
          }
        }
        setTimeout(() => { try { this._ui.clearCenterMsg(); } catch (_) {} }, 1400);
      } catch (err) {
        console.warn('[UI] restorePurchases click failed', err);
        try { this._ui.setCenterMsg('Restore failed'); } catch (_) {}
        setTimeout(() => { try { this._ui.clearCenterMsg(); } catch (_) {} }, 1400);
      } finally {
        try { btn.disabled = false; } catch (_) {}
      }
    });
  }

  async _initEntities() {
    // Create player
    this._player = new Player();
    this._scene.add(this._player.mesh);
    try { updateEnvironmentFollow(this._env, this._player); } catch (e) {}

    // Setup hero bars
    this._heroBars = createHeroOverheadBars();
    this._player.mesh.add(this._heroBars.container);

    // Player death handler
    this._player.onDeath = () => {
      this._player.deadUntil = now() + 3;
      this._ui.setCenterMsg(t("death.msg"));
      this._player.aimMode = false;
      this._player.aimModeSkill = null;
      this._player.moveTarget = null;
      this._player.target = null;
    };

    this._selectedUnit = this._player;

    // Map unlock system
    try {
      this._mapManager.unlockByLevel(this._player.level);
      window.addEventListener("player-levelup", (ev) => {
        try {
          const lvl = ev?.detail?.level || this._player.level;
          const unlockedChanged = this._mapManager.unlockByLevel(lvl);
          if (unlockedChanged) {
            const prevIdx = this._mapManager.getCurrentIndex?.() || 1;
            const maxIdx = this._mapManager.getUnlockedMax?.() || prevIdx;
            if (maxIdx > prevIdx) {
              if (this._mapManager.setCurrent?.(maxIdx)) {
                this._enemies.forEach((en) => this._applyMapModifiersToEnemy(en));
                try { this._adjustEnemyCountForCurrentMap(); } catch (_) {}
                this._ui.setCenterMsg(`Unlocked and switched to MAP ${maxIdx}`);
                setTimeout(() => this._ui.clearCenterMsg(), 1400);
              }
            }
          }
        } catch (_) {}
      });
    } catch (_) {}

    try { promptBasicUpliftIfNeeded(this._player); } catch (_) {}
    try { 
      window.addEventListener("player-levelup", () => { 
        try { promptBasicUpliftIfNeeded(this._player); } catch (_) {}
        try { this._adjustEnemyCountForCurrentMap(); } catch (_) {}
      }); 
    } catch (_) {}

    // Portals
    try {
      this._portals = initPortals(this._scene);
    } catch (e) {
      console.warn("[PORTALS] init failed:", e);
      this._portals = null;
    }

    // Village visuals
    const houses = [
      (() => { const h = createHouse(); h.position.set(8, 0, -8); this._scene.add(h); return h; })(),
      (() => { const h = createHouse(); h.position.set(-10, 0, 10); this._scene.add(h); return h; })(),
      (() => { const h = createHouse(); h.position.set(-16, 0, -12); this._scene.add(h); return h; })(),
    ];

    const fenceGroup = createVillageFence(VILLAGE_POS, REST_RADIUS, COLOR);
    this._scene.add(fenceGroup);

    // Villages system
    this._villages = createVillagesSystem(this._scene, this._portals);

    // Gather villa structures
    try {
      this._scene.traverse((o) => {
        try {
          if (o && o.userData && o.userData.structure === "villa") {
            const center = (o.userData && o.userData.center) ? o.userData.center.clone() : (o.position ? o.position.clone() : null);
            const radius = (o.userData && o.userData.radius) ? o.userData.radius : 6;
            if (center) this._villaStructures.push({ obj: o, center, radius });
          }
        } catch (_) {}
      });
    } catch (_) {}

    // Dynamic spawner
    const renderQuality = this._settingsManager.getRenderQuality();
    this._spawner = createDynamicSpawner({
      scene: this._scene, 
      player: this._player, 
      enemies: this._enemies, 
      mapManager: this._mapManager, 
      villages: this._villages, 
      WORLD,
      EnemyClass: Enemy, 
      now, 
      distance2D, 
      VILLAGE_POS, 
      REST_RADIUS,
      renderQuality, 
      applyMapModifiersToEnemy: this._applyMapModifiersToEnemy.bind(this), 
      chunkMgr: this._chunkMgr
    });
    this._spawner.initialSpawn();

    try { window.adjustEnemyCountForMap = this._adjustEnemyCountForCurrentMap.bind(this); } catch (_) {}
  }

  async _initManagers() {
    // UI Controller
    this._uiController = new UIController({
      ui: this._ui,
      player: this._player,
      heroBars: this._heroBars,
      camera: this._camera,
      clamp01,
      isMobile,
      MOBILE_OPTIMIZATIONS
    });

    // Buff Manager
    this._buffManager = new BuffManager({
      THREE,
      player: this._player,
      setCenterMsg: (msg) => this._uiController.setCenterMsg(msg),
      clearCenterMsg: () => this._uiController.clearCenterMsg()
    });

    // Proximity Manager
    this._proximityManager = new ProximityManager({
      player: this._player,
      chunkMgr: this._chunkMgr,
      villaStructures: this._villaStructures,
      buffManager: this._buffManager,
      setCenterMsg: (msg) => this._uiController.setCenterMsg(msg),
      clearCenterMsg: () => this._uiController.clearCenterMsg(),
      getStructureProtectionRadius
    });

    // Wire village buff events
    window.addEventListener('village-enter', () => this._buffManager.applyVillageBuff());
    window.addEventListener('village-leave', () => this._buffManager.removeVillageBuff());

    // Respawn system
    this._respawnSystem = createRespawnSystem({ 
      THREE, 
      now, 
      VILLAGE_POS, 
      setCenterMsg: (t) => this._ui.setCenterMsg(t), 
      clearCenterMsg: () => this._ui.clearCenterMsg(), 
      player: this._player 
    });
  }

  async _initSystems() {
    this._cameraSystem = new CameraSystem({ THREE, now, effects: this._effects });
    this._playerSystem = new PlayerSystem({ THREE, now, dir2D, distance2D, WORLD, renderer: this._renderer });
    this._enemiesSystem = new EnemiesSystem({
      THREE, WORLD, VILLAGE_POS, REST_RADIUS,
      dir2D, distance2D, now, audio, effects: this._effects,
      scene: this._scene, player: this._player, enemies: this._enemies, 
      villages: this._villages, mapManager: this._mapManager,
      isMobile, MOBILE_OPTIMIZATIONS, camera: this._camera,
      shouldSpawnVfx: this._shouldSpawnVfx, 
      applyMapModifiersToEnemy: this._applyMapModifiersToEnemy.bind(this), 
      chunkMgr: this._chunkMgr
    });

    // Initialize AI and billboard strides for mobile
    const renderQuality = this._settingsManager.getRenderQuality();
    this._aiStride = renderQuality === "low" ? 3 : (renderQuality === "medium" ? 2 : 1);
    if (isMobile) {
      this._aiStride = Math.ceil(this._aiStride * MOBILE_OPTIMIZATIONS.aiStrideMultiplier);
    }

    this._bbStride = renderQuality === "high" ? 2 : 3;
    if (isMobile) {
      this._bbStride = Math.max(5, this._bbStride + 2);
    }

    if (isMobile) {
      console.info(`[Mobile] AI stride: ${this._aiStride}, Billboard stride: ${this._bbStride}`);
    }
  }

  async _initSkillsAndInput() {
    // Skills system
    this._skillsSystem = new SkillsSystem(
      this._player, 
      this._enemies, 
      this._effects, 
      this._ui.getCooldownElements(), 
      this._villages
    );
    
    try { window.__skillsRef = this._skillsSystem; this._player.skills = this._skillsSystem; } catch (_) {}
    try { initHeroPreview(this._skillsSystem, { heroScreen: document.getElementById("heroScreen") }); } catch (_) {}

    // Touch controls
    this._touch = initTouchControls({ 
      player: this._player, 
      skills: this._skillsSystem, 
      effects: this._effects, 
      aimPreview: null, 
      attackPreview: null, 
      enemies: this._enemies, 
      getNearestEnemy, 
      WORLD, 
      skillApi: { getSkill, setSkill } 
    });

    // Loadout
    this._currentLoadout = loadOrDefault(SKILLS_POOL, DEFAULT_LOADOUT);
    this._applyLoadoutToSKILLS(this._currentLoadout);
    updateSkillBarLabels();
    try { window.updateSkillBarLabels = updateSkillBarLabels; } catch (e) {}

    window.addEventListener("loadout-changed", () => {
      try {
        this._currentLoadout = loadOrDefault(SKILLS_POOL, DEFAULT_LOADOUT);
        this._applyLoadoutToSKILLS(this._currentLoadout);
        updateSkillBarLabels();
        if (this._skillsSystem && typeof this._skillsSystem.refreshSkills === 'function') {
          this._skillsSystem.refreshSkills();
        }
      } catch (_) {}
    });

    // Hero screen
    const btnHeroScreen = document.getElementById("btnHeroScreen");
    const heroScreen = document.getElementById("heroScreen");

    // Raycasting
    const enemyMeshes = [];
    const refreshEnemyMeshes = () => {
      try {
        enemyMeshes.length = 0;
        for (const en of this._enemies) {
          if (en.alive) enemyMeshes.push(en.mesh);
        }
      } catch (_) {}
    };
    refreshEnemyMeshes();
    try { clearInterval(window.__enemyMeshRefreshInt); } catch (_) {}
    window.__enemyMeshRefreshInt = setInterval(refreshEnemyMeshes, 200);

    const raycast = createRaycast({
      renderer: this._renderer, 
      camera: this._camera, 
      ground: this._ground,
      enemiesMeshesProvider: () => enemyMeshes,
      playerMesh: this._player.mesh,
    });

    // Input service
    this._inputService = createInputService({
      renderer: this._renderer, 
      raycast, 
      camera: this._camera, 
      portals: this._portals, 
      player: this._player, 
      enemies: this._enemies,
      effects: this._effects, 
      skills: this._skillsSystem, 
      WORLD, 
      aimPreview: null, 
      attackPreview: null,
      setCenterMsg: (t) => this._uiController.setCenterMsg(t),
      clearCenterMsg: () => this._uiController.clearCenterMsg(),
    });
    this._inputService.attachCaptureListeners();
    if (typeof this._touch !== "undefined" && this._touch) {
      this._inputService.setTouchAdapter(this._touch);
    }

    // Wire UI elements
    this._wireUIElements();
  }

  _wireUIElements() {
    const btnHeroScreen = document.getElementById("btnHeroScreen");
    const heroScreen = document.getElementById("heroScreen");
    const introScreen = document.getElementById("introScreen");
    const btnStart = document.getElementById("btnStart");
    const btnCamera = document.getElementById("btnCamera");
    const btnPortal = document.getElementById("btnPortal");
    const btnMark = document.getElementById("btnMark");

    // Wire mark cooldown UI
    this._disposeMarkCooldownUI = wireMarkCooldownUI({ 
      btnMark, 
      portals: this._portals, 
      intervalMs: 500 
    });
    try { window.__disposeMarkCooldownUI = this._disposeMarkCooldownUI; } catch (_) {}

    // Wire top bar
    this._disposeTopBar = wireTopBar({
      elements: { btnHeroScreen, heroScreen, btnStart, introScreen, btnCamera, btnPortal, btnMark },
      actions: {
        showHeroScreen: () => this._showHeroScreen("skills"),
        setFirstPerson: (enabled) => this._worldManager.setFirstPersonMode(enabled, this._player, this._heroBars),
        getFirstPerson: () => this._worldManager.isFirstPersonMode(),
        portals: this._portals,
        getPlayer: () => this._player,
        setCenterMsg: (t) => this._uiController.setCenterMsg(t),
        clearCenterMsg: () => this._uiController.clearCenterMsg(),
        startInstructionGuide: startInstructionGuideOverlay
      }
    });
    try { window.__disposeTopBar = this._disposeTopBar; } catch (_) {}

    // Wire UI bindings
    const ENV_PRESETS = [
      { treeCount: 20, rockCount: 10, flowerCount: 60, villageCount: 1 },
      { treeCount: 60, rockCount: 30, flowerCount: 120, villageCount: 1 },
      { treeCount: 140, rockCount: 80, flowerCount: 300, villageCount: 2 },
    ];

    const audioCtl = {
      audio,
      getMusicEnabled: () => this._settingsManager.isMusicEnabled(),
      setMusicEnabled: (v) => {
        this._settingsManager.setMusicEnabled(v);
        if (v && !audio.isPlaying()) {
          audio.ensureBackgroundMusic("audio/earth-space-music-313081.mp3", { volume: 0.35, loop: true });
        } else if (!v) {
          audio.stopMusic();
        }
      },
      getSfxEnabled: () => this._settingsManager.isSfxEnabled(),
      setSfxEnabled: (v) => {
        this._settingsManager.setSfxEnabled(v);
        audio.setSfxVolume(v ? 0.5 : 0.0);
      },
    };

    wireUIBindings({
      storageKey, 
      scene: this._scene, 
      getPlayer: () => this._player, 
      ENV_PRESETS,
      initEnvironment, 
      updateEnvironmentFollow,
      envAccess: { 
        get: () => ({
          env: this._env,
          envRainState: this._settingsManager.isRainEnabled(),
          envDensityIndex: this._settingsManager.getEnvironmentDensity(),
          envRainLevel: this._settingsManager.getRainLevel()
        }),
        set: (st) => {
          this._env = st.env ?? this._env;
          if (typeof st.envRainState === 'boolean') this._settingsManager.setRainEnabled(st.envRainState);
          if (typeof st.envDensityIndex === 'number') this._settingsManager.setEnvironmentDensity(st.envDensityIndex);
          if (typeof st.envRainLevel === 'number') this._settingsManager.setRainLevel(st.envRainLevel);
        }
      },
      renderQualityRef: { 
        get: () => this._settingsManager.getRenderQuality(), 
        set: (q) => this._settingsManager.setRenderQuality(q) 
      },
      cameraOffset: this._cameraOffset, 
      baseCameraOffset: this._worldManager.getBaseCameraOffset(),
      audioCtl, 
      audio
    });
  }

  _setupGameLoop() {
    const MOVE_PING_INTERVAL = 0.3;

    this._gameLoop = new GameLoop({
      now,
      isMobile,
      MOBILE_OPTIMIZATIONS,
      onUpdate: (dt, t, { isOverBudget }) => {
        // Performance tracking
        try {
          this._perfTracker.update(performance.now());
          this._perfTracker.maybeAutoAdjustVfxQuality();
        } catch (_) {}

        // Input
        this._inputService.update(t, dt);

        // Mobile joystick
        try {
          if (typeof this._touch !== "undefined" && this._touch) {
            const joy = this._touch.getMoveDir?.();
            if (joy && joy.active && !this._player.frozen && !this._player.aimMode) {
              const speed = 10;
              const base = this._player.pos();
              const px = base.x + joy.x * speed;
              const pz = base.z + joy.y * speed;
              this._player.moveTarget = new THREE.Vector3(px, 0, pz);
              this._player.attackMove = false;
              this._player.target = null;

              try {
                const tnow = now();
                if (!this._joyContPingT || tnow >= this._joyContPingT) {
                  this._effects.spawnMovePing(new THREE.Vector3(px, 0, pz));
                  this._joyContPingT = tnow + MOVE_PING_INTERVAL;
                }
              } catch (e) {}
            } else {
              try { this._joyContPingT = 0; } catch (_) {}
            }
          }
        } catch (_) {}

        // Arrow key movement
        try {
          const ks = this._inputService && this._inputService._state ? this._inputService._state.moveKeys : null;
          let active = false, dx = 0, dy = 0;
          if (ks) {
            dx = (ks.right ? 1 : 0) + (ks.left ? -1 : 0);
            dy = (ks.down ? 1 : 0) + (ks.up ? -1 : 0);
            const len = Math.hypot(dx, dy);
            if (len > 0) { dx /= len; dy /= len; active = true; }
          }

          if (active && !this._player.frozen && !this._player.aimMode) {
            const speed = 10;
            const base = this._player.pos();
            const px = base.x + dx * speed;
            const pz = base.z + dy * speed;

            if (!this._arrowWasActive) {
              this._effects.spawnMovePing(new THREE.Vector3(px, 0, pz));
              this._arrowContPingT = t + MOVE_PING_INTERVAL;
            } else if (!this._arrowContPingT || t >= this._arrowContPingT) {
              this._effects.spawnMovePing(new THREE.Vector3(px, 0, pz));
              this._arrowContPingT = t + MOVE_PING_INTERVAL;
            }
            this._arrowWasActive = true;
          } else {
            this._arrowWasActive = false;
            this._arrowContPingT = 0;
          }
        } catch (_) {}

        // Player update
        this._playerSystem.updatePlayer(dt, { player: this._player, lastMoveDir: this._lastMoveDir });

        // Enemies update
        this._enemiesSystem.update(dt, { 
          aiStride: this._aiStride, 
          bbStride: this._bbStride, 
          bbOffset: this._bbOffset 
        });

        // Dynamic spawner
        try { this._spawner && this._spawner.update(dt); } catch (e) {}

        // Camera update
        if (this._worldManager.isFirstPersonMode()) {
          this._cameraSystem.updateFirstPerson(this._camera, this._player, this._lastMoveDir, dt);
        } else {
          this._worldManager.updateCameraForPlayer(this._player, this._lastMoveDir, dt);
        }

        // Grid and environment follow
        this._worldManager.updateGridForPlayer(this._player);
        if (this._env) updateEnvironmentFollow(this._env, this._player);
        if (this._chunkMgr) { 
          try { this._chunkMgr.update(this._player.pos()); } catch (_) {} 
        }

        // UI updates (throttled via UIController)
        this._uiController.updateHUD();
        this._uiController.updateMinimap(this._enemies, this._portals, this._villages, this._chunkMgr);
        this._uiController.updateHeroBars();

        // Skills, effects, environment
        this._skillsSystem.update(t, dt, this._cameraShake);
        this._effects.update(t, dt);
        if (this._env && typeof this._env.update === "function") this._env.update(t, dt);

        // Village streaming (throttled)
        if (!window.__lastVillageStreamT) window.__lastVillageStreamT = 0;
        const nowMs = performance.now();
        if ((nowMs - window.__lastVillageStreamT) >= 150) {
          try { this._villages.ensureFarVillage(this._player.pos()); } catch (_) {}
          try { this._villages.updateVisitedVillage(this._player.pos()); } catch (_) {}
          window.__lastVillageStreamT = nowMs;
        }

        if (!isOverBudget()) {
          this._indicators.update(dt, { now, player: this._player, enemies: this._enemies, selectedUnit: this._selectedUnit });
          this._portals.update(dt);
          this._villages.updateRest(this._player, dt);

          // Proximity checks
          this._proximityManager.update();

          this._respawnSystem.update();
        }

        if (!isOverBudget()) {
          this._bbOffset = (this._bbOffset + 1) % this._bbStride;
        }

        // Render
        this._renderer.render(this._scene, this._camera);

        // Game ready event
        try {
          if (!window.__gameRenderReadyDispatched) {
            window.__gameRenderReadyDispatched = true;
            try {
              const c = this._renderer && this._renderer.domElement;
              if (c) {
                try { c.style.opacity = "1"; } catch (_) {}
              }
            } catch (_) {}
            try { window.dispatchEvent(new Event("game-render-ready")); } catch (_) {}
          }
        } catch (_) {}

        // Adaptive performance
        try {
          if (!this._adaptNextT || t >= this._adaptNextT) {
            const fps = (this._perfTracker.getFPS && this._perfTracker.getFPS()) || 60;
            let scale = this._spawner ? this._spawner.getPerformanceScale() : 1.0;
            if (fps < 25) {
              this._aiStride = Math.min(8, (this._aiStride || 1) + 1);
              scale = Math.max(1.0, scale - 0.05);
            } else if (fps > 50) {
              this._aiStride = Math.max(1, (this._aiStride || 1) - 1);
              scale = Math.min(1.2, scale + 0.05);
            }
            this._spawner && this._spawner.setPerformanceScale(scale);
            this._adaptNextT = t + 1.5;
          }
        } catch (_) {}
      }
    });
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  _applyMapModifiersToEnemy(en) {
    try {
      const mods = this._mapManager.getModifiers?.() || {};
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

  _adjustEnemyCountForCurrentMap() {
    try {
      this._spawner && this._spawner.adjustForMapChange();
    } catch (_) {}
  }

  _applyLoadoutToSKILLS(loadoutIds) {
    setLoadoutAndApply(loadoutIds, {
      upgradeMapper: (id, base) => {
        try {
          const mgr = getSkillUpgradeManager();
          return mgr ? mgr.applyUpgradeBonuses(id, base) : base;
        } catch (_) { return base; }
      }
    });
  }

  _setLoadoutAndSave(ids) {
    const resolved = resolveLoadout(SKILLS_POOL, ids, DEFAULT_LOADOUT);
    this._currentLoadout = resolved;
    setLoadoutAndApply(this._currentLoadout, {
      upgradeMapper: (id, base) => {
        try {
          const mgr = getSkillUpgradeManager();
          return mgr ? mgr.applyUpgradeBonuses(id, base) : base;
        } catch (_) { return base; }
      }
    });
    saveLoadout(this._currentLoadout);
    updateSkillBarLabels();
  }

  _showHeroScreen(initialTab = "skills") {
    const ctx = {
      t, 
      player: this._player, 
      SKILL_POOL: SKILLS_POOL, 
      DEFAULT_LOADOUT, 
      currentLoadout: this._currentLoadout,
      setLoadoutAndSave: this._setLoadoutAndSave.bind(this), 
      updateSkillBarLabels, 
      mapManager: this._mapManager, 
      portals: this._portals, 
      enemies: this._enemies,
      effects: this._effects, 
      WORLD, 
      setCenterMsg: (m) => this._uiController.setCenterMsg(m),
      clearCenterMsg: () => this._uiController.clearCenterMsg(),
      applyMapModifiersToEnemy: this._applyMapModifiersToEnemy.bind(this), 
      adjustEnemyCountForMap: this._adjustEnemyCountForCurrentMap.bind(this),
    };
    try { audio.ensureBackgroundMusic("audio/earth-space-music-313081.mp3", { volume: 0.35, loop: true }); } catch (_) {}
    try { renderHeroScreenUI(initialTab, ctx); } catch (_) {}
  }
}
