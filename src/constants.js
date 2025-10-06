import * as THREE from "../vendor/three/build/three.module.js";
import { SKILL_COLOR_TOKENS } from "./skills_pool.js";

export const LOCAL_STORAGE_PREFIX = "gof";

export const storageKey = (suffix, separator = ".") => {
  const suffixStr = String(suffix ?? "");
  const sep = typeof separator === "string" ? separator : ".";
  return `${LOCAL_STORAGE_PREFIX}${sep || ""}${suffixStr}`;
};

export const STORAGE_KEYS = {
  renderPrefs: storageKey("renderPrefs"),
  envPrefs: storageKey("envPrefs"),
  audioPrefs: storageKey("audioPrefs"),
  uiPrefs: storageKey("uiPrefs"),
  pendingReloadReason: storageKey("pendingReloadReason"),
  appPurchased: storageKey("app.purchased"),
  playerLevel: storageKey("playerLevel"),
  mapCurrentIndex: storageKey("mapCurrentIndex"),
  mapUnlockedMax: storageKey("mapUnlockedMax"),
  upliftChoices: storageKey("upliftChoices_v1"),
  persistentMarks: storageKey("persistentMarks"),
  markNextReadyAt: storageKey("markNextReadyAt"),
  villages: storageKey("dynamic.villages.v1"),
  roads: storageKey("dynamic.roads.v1"),
  roadsGeom: storageKey("dynamic.roads_geom.v1"),
  worldSeed: storageKey("worldSeed"),
  chunkPrefix: storageKey("chunk"),
  lang: storageKey("lang"),
  fireLoadout: storageKey("fire_loadout"),
  skillLevels: storageKey("skill_levels"),
  skillPoints: storageKey("skill_points"),
  unlockedSkills: storageKey("unlocked_skills"),
};

// Utilities to resolve theme colors from css/base.css variables at runtime
const __styleCache = { computed: null };

function getRootComputedStyle(){
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (!__styleCache.computed) {
    __styleCache.computed = getComputedStyle(document.documentElement);
  }
  return __styleCache.computed;
}

function readCssVar(varName){
  const cs = getRootComputedStyle();
  if (!cs) return "";
  return cs.getPropertyValue(varName)?.trim() || "";
}

function parseCssColorToHexInt(value){
  if (!value) return null;
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    return Number("0x" + h);
  }
  const rgb = v.match(/^rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
  if (rgb) {
    const r = Math.max(0, Math.min(255, Math.round(parseFloat(rgb[1]))));
    const g = Math.max(0, Math.min(255, Math.round(parseFloat(rgb[2]))));
    const b = Math.max(0, Math.min(255, Math.round(parseFloat(rgb[3]))));
    return (r << 16) | (g << 8) | b;
  }
  return null;
}

// Exported helper: resolve CSS var to 0xRRGGBB with fallback integer
export function cssVarToHexInt(varName, fallbackInt){
  const raw = readCssVar(varName);
  const parsed = parseCssColorToHexInt(raw);
  return (parsed === null || Number.isNaN(parsed)) ? fallbackInt : parsed;
}

export const COLOR = {
  // Values resolve from css/base.css :root at runtime with fallbacks to previous literals
  get fire() { return cssVarToHexInt("--theme-orange", 0xff4500); },          // primary fire orange
  get darkFire() { return cssVarToHexInt("--dark-orange", 0x8b0000); },       // deep dark
  get midFire() { return cssVarToHexInt("--theme-light-orange", 0xff6347); }, // lighter orange
  get white() { return cssVarToHexInt("--white", 0xfff5e6); },                // warm text white
  get hp() { return cssVarToHexInt("--hp", 0xff6b6b); },                      // HP red
  get mp() { return cssVarToHexInt("--mp", 0xff8c00); },                      // MP blue (fallback: dark orange)
  get xp() { return cssVarToHexInt("--xp", 0xffd700); },                      // XP gold/orange

  // Not currently defined in css variables - keep literals for now
  enemy: 0x4a0e0e,
  enemyDark: 0x2b0505,

  // Source of truth from skills_pool.js
  get portal() { return SKILL_COLOR_TOKENS.portal; },
  get village() { return SKILL_COLOR_TOKENS.village; },
  get lava() { return SKILL_COLOR_TOKENS.lava; },
  get ember() { return SKILL_COLOR_TOKENS.ember; },
  get ash() { return SKILL_COLOR_TOKENS.ash; },
  get volcano() { return SKILL_COLOR_TOKENS.volcano; },
};
 
// CSS variable references for DOM styling (preferred for live theming)
export const CSS_VAR = {
  themeDark: "var(--theme-dark)",
  themeOrange: "var(--theme-orange)",
  themeLightOrange: "var(--theme-light-orange)",
  themeWhite: "var(--theme-white)",
  themeAccent: "var(--theme-accent)",
  themeYellow: "var(--theme-yellow)",
  white: "var(--white)",
  accent: "var(--accent)",
  // System UI
  systemBg: "var(--system-bg)",
  systemBorder: "var(--system-border)",
  systemText: "var(--system-text)",
  systemAccent: "var(--system-accent)",
  // Common borders / glass
  borderOrange: "var(--border-orange)",
  borderOrangeLight: "var(--border-orange-light)",
  borderOrangeSubtle: "var(--border-orange-subtle)",
  borderWhiteSubtle: "var(--border-white-subtle)",
  borderWhiteFaint: "var(--border-white-faint)",
  glass: "var(--glass)",
  glassStrong: "var(--glass-strong)",
  textWarm: "var(--text-warm)",
  textWarmLight: "var(--text-warm-light)",
  shadowMedium: "var(--shadow-medium)",
  shadowStrong: "var(--shadow-strong)",
  glowOrange: "var(--glow-orange)",
  glowOrangeStrong: "var(--glow-orange-strong)",
};

// CSS color fallbacks (exact values) for contexts that do not support CSS variables (e.g., Canvas2D)
export const CSS_COLOR = {
  // Mirrors css/base.css tokens
  glass: "rgba(26, 10, 5, 0.7)",
  glassStrong: "rgba(26, 10, 5, 0.85)",
  borderOrange: "rgba(255, 140, 66, 0.35)",
  borderOrangeLight: "rgba(255, 140, 66, 0.3)",
  borderOrangeSubtle: "rgba(255, 140, 66, 0.15)",
  borderWhiteSubtle: "rgba(255, 255, 255, 0.12)",
  borderWhiteFaint: "rgba(255, 255, 255, 0.06)",
  // Useful UI colors not in variables but used by Canvas/HUD
  roadUnderlay: "rgba(210, 200, 190, 0.15)",
  roadDark: "rgba(43, 36, 32, 0.9)",
  villageRing: "rgba(90, 255, 139, 0.6)",
  villageRingFaint: "rgba(90, 255, 139, 0.35)",
  portal: "rgba(124, 77, 255, 0.9)",
  portalAlt: "rgba(180, 120, 255, 0.9)",
  enemyDot: "rgba(255, 80, 80, 0.95)",
  yellowGlowStrong: "rgba(255, 215, 90, 0.95)",
  playerDot: "rgba(126, 204, 255, 1)",
};

export const WORLD = {
  groundSize: 500,     // local visual grid chunk size
  gridStep: 2,
  // Dynamic enemy spawning around hero (not fixed on map)
  enemyCount: 200,     // Legacy: used for initial spawn only
  enemySpawnRadius: 220,
  enemySpawnMinRadius: 30,  // Minimum spawn distance from hero
  // Dynamic spawning configuration
  dynamicSpawn: {
    enabled: true,
    minEnemies: 40,           // Minimum enemies around hero at level 1
    maxEnemies: 80,           // Maximum enemies around hero at high levels
    enemiesPerLevel: 2,       // Additional enemies per player level
    spawnInterval: 3,         // Seconds between continuous spawn checks
    spawnBatchSize: 3,        // Enemies to spawn per interval
    movementThreshold: 50,    // Distance hero must move to trigger burst spawn
    burstSpawnSize: 8,        // Enemies to spawn when hero moves significantly
    checkRadius: 250,         // Radius to count nearby enemies
  },
  // Make the player slightly faster and more responsive
  playerSpeed: 16,
  playerTurnSpeed: 10,
  // Slightly longer attack range and faster basic attack
  attackRange: 32,
  attackRangeMult: 1,
  basicAttackCooldown: 0.2,
  basicAttackDamage: 24,
  // Enemies are more aggressive and a bit tougher
  aiAggroRadius: 60,
  aiForgetRadius: 100,
  aiWanderRadius: 40,
  aiSpeed: 10,
  aiAttackRange: 10,
  aiAttackCooldown: 1.2,
  aiAttackDamage: 14,
  enemyRespawnDelay: 8,
  // Chunked world streaming
  chunking: {
    enabled: true,      // enable streaming chunks for environment/structures
    size: 150,          // chunk size in world units
    radius: 3,          // load radius in chunks (box radius)
    storagePrefix: storageKey("chunk")
  },
};

export const STATS_BASE = {
  // Hero as a "god" baseline: much higher HP/MP and regen so the player can clear many enemies
  hp: 800,
  mp: 400,
  hpRegen: 8,
  mpRegen: 4,
  // Increase XP required to level to give longer progression window
  xpToLevel: 200,
};

 
// Progression and balancing knobs (tweak for desired pacing)
export const SCALING = {
  // XP curve multiplier applied to xpToLevel each time the hero levels up
  xpGrowth: 1.2,
  hero: {
    // Multiplicative per-level growth factors
    hpGrowth: 1.12,
    mpGrowth: 1.10,
    hpRegenGrowth: 1.08,
    mpRegenGrowth: 1.06,
    // Damage scaling
    baseDamageGrowth: 1.12,   // basic attack
    skillDamageGrowth: 1.10,  // skills
    // Movement and attack speed growth (small, per level)
    moveSpeedGrowth: 1.01,    // +1% movement speed per level
    atkSpeedGrowth: 1.01      // +1% permanent attack speed per level (reduces basic CD)
  },
  enemy: {
    // Per-hero-level growth factors for enemies
    hpGrowthPerLevel: 1.09,
    dmgGrowthPerLevel: 1.06,
    // Tier probability scaling with player level
    // Base probabilities: normal=78%, tough=18%, elite=3.5%, boss=0.5%
    tierScaling: {
      toughPerLevel: 0.005,   // +0.5% tough chance per level
      elitePerLevel: 0.003,   // +0.3% elite chance per level
      bossPerLevel: 0.001,    // +0.1% boss chance per level
    },
  },
};

export const FX = {
  // Global VFX timing controls. Increase timeScale to make effects last longer.
  // Reduce the *_RateScale to slow animations (fade, scaling, spins, orbits).
  timeScale: 1.6 * 1.2,          // >1 = longer lifetimes (slower overall VFX)
  fadeSpeedScale: 0.6 / 1.2,     // <1 = slower fades
  scaleRateScale: 0.6 / 1.2,     // <1 = slower scale growth animations
  spinRateScale: 0.6 / 1.2,      // <1 = slower spin animations
  orbitRateScale: 0.6 / 1.2,     // <1 = slower orbit movement
  pulseRateScale: 0.6 / 1.2,     // <1 = slower pulsing (breathing) animations
  popupDurationScale: 1.5 * 2, // >1 = damage popups linger longer
  sfxOnCast: true          // play a generic "cast" sound immediately on skill cast
};
 
// Village and recall/portals
export const VILLAGE_POS = new THREE.Vector3(0, 0, 0);
export const REST_RADIUS = 20;
export const HERO_MODEL_URL = null;
