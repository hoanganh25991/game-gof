import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export const COLOR = {
  // Fire theme colors
  fire: 0xff4500,        // Orange-red fire
  darkFire: 0x8b0000,    // Dark red/crimson
  midFire: 0xff6347,     // Tomato red
  white: 0xfff5e6,       // Warm white
  hp: 0xff6b6b,          // Warm red for HP
  mp: 0xff8c00,          // Dark orange for mana (fire energy)
  xp: 0xffd700,          // Gold for XP
  enemy: 0x4a0e0e,       // Dark burnt color for enemies
  enemyDark: 0x2b0505,   // Very dark burnt
  portal: 0xff1493,      // Hot pink/magenta portal
  village: 0xffb347,     // Warm orange for village
  lava: 0xff4500,        // Lava orange-red
  ember: 0xffa500,       // Ember orange
  ash: 0x696969,         // Ash gray
  volcano: 0x8b4513,     // Volcanic brown
};

export const WORLD = {
  groundSize: 500,     // local visual grid chunk size
  gridStep: 2,
  // Increased enemy density for "hunter" playstyle:
  enemyCount: 200,
  enemySpawnRadius: 220,
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

export const SKILLS = {
  // Fire-themed skills for mass-clear gameplay.
  Q: { name: "Flame Chain", cd: 4, mana: 20, range: 60, jumps: 8, jumpRange: 30, dmg: 120 },
  W: { name: "Inferno Blast (AOE)", cd: 6, mana: 40, radius: 18, dmg: 220 },
  E: { name: "Burning Aura", cd: 12, mana: 0, radius: 18, tick: 0.6, dmg: 18, duration: 12, manaPerTick: 3 },
  R: { name: "Meteor Storm", cd: 18, mana: 70, radius: 36, strikes: 40, dmg: 90, duration: 8 },
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
