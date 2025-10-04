/**
 * src/skill_upgrades.js
 *
 * Skill upgrade system for God of Fire
 * 
 * Features:
 * - Each skill can be upgraded up to level 5
 * - Upgrades improve damage, reduce cooldown, increase range/radius, etc.
 * - Skills unlock at specific player levels
 * - Players earn skill points on level-up to spend on upgrades
 */

import { SKILL_POOL } from "./skills_pool.js";

const STORAGE_KEY = "gof_skill_levels";
const STORAGE_KEY_POINTS = "gof_skill_points";
const STORAGE_KEY_UNLOCKED = "gof_unlocked_skills";

/**
 * Max player level required to guarantee every skill is unlocked.
 * Adjust this to rebalance the pacing of skill unlocks.
 */
export const MAX_SKILL_UNLOCK_LEVEL = 25;

const STARTING_LEVEL = 1;
const STARTING_SKILL_COUNT = 4; // Keep a few early skills available from level 1
const UNLOCK_CURVE_EXPONENT = 1.2; // >1 pushes later skills toward higher levels

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * Determine unlock levels dynamically based on the ordered skill pool.
 */
function computeSkillUnlockLevels(skillPool, maxLevel) {
  if (!Array.isArray(skillPool) || skillPool.length === 0) {
    return {};
  }

  const unlockLevels = {};
  const totalSkills = skillPool.length;
  const starters = Math.min(STARTING_SKILL_COUNT, totalSkills);
  const remaining = Math.max(0, totalSkills - starters);
  const denominator = Math.max(1, remaining - 1);

  for (let index = 0; index < totalSkills; index++) {
    const skillDef = skillPool[index];
    if (!skillDef || !skillDef.id) continue;

    let level = STARTING_LEVEL;
    if (index >= starters && remaining > 0) {
      const offset = index - starters;
      const normalized = clamp01(offset / denominator);
      const curved = Math.pow(normalized, UNLOCK_CURVE_EXPONENT);
      level = Math.max(
        STARTING_LEVEL + 1,
        Math.round(STARTING_LEVEL + curved * (maxLevel - STARTING_LEVEL))
      );
    }

    unlockLevels[skillDef.id] = Math.min(maxLevel, level);
  }

  return unlockLevels;
}

/**
 * Skill unlock requirements (player level needed to unlock each skill).
 */
export const SKILL_UNLOCK_LEVELS = computeSkillUnlockLevels(
  SKILL_POOL,
  MAX_SKILL_UNLOCK_LEVEL
);

/**
 * Skill upgrade bonuses per level
 * Each level provides cumulative bonuses
 */
export const SKILL_UPGRADE_BONUSES = {
  damage: [0, 0.15, 0.30, 0.50, 0.75],      // +15%, +30%, +50%, +75% damage at levels 1-4
  cooldown: [0, 0.10, 0.18, 0.25, 0.35],    // -10%, -18%, -25%, -35% cooldown at levels 1-4
  range: [0, 0.10, 0.20, 0.30, 0.40],       // +10%, +20%, +30%, +40% range at levels 1-4
  radius: [0, 0.12, 0.25, 0.40, 0.60],      // +12%, +25%, +40%, +60% radius at levels 1-4
  duration: [0, 0.15, 0.30, 0.50, 0.75],    // +15%, +30%, +50%, +75% duration at levels 1-4
  mana: [0, -0.08, -0.15, -0.22, -0.30],    // -8%, -15%, -22%, -30% mana cost at levels 1-4
};

/**
 * Maximum skill level
 */
export const MAX_SKILL_LEVEL = 5;

/**
 * Skill points earned per player level
 */
export const SKILL_POINTS_PER_LEVEL = 1;

/**
 * Skill upgrade manager class
 */
export class SkillUpgradeManager {
  constructor() {
    this.skillLevels = new Map(); // skill_id -> level (1-5)
    this.skillPoints = 0;
    this.unlockedSkills = new Set();
    this.loadFromStorage();
  }

  /**
   * Initialize unlocked skills based on player level
   */
  initializeUnlockedSkills(playerLevel) {
    for (const [skillId, unlockLevel] of Object.entries(SKILL_UNLOCK_LEVELS)) {
      if (playerLevel >= unlockLevel) {
        this.unlockedSkills.add(skillId);
      }
    }
    this.saveToStorage();
  }

  /**
   * Check if a skill is unlocked
   */
  isSkillUnlocked(skillId) {
    return this.unlockedSkills.has(skillId);
  }

  /**
   * Get the unlock level for a skill
   */
  getSkillUnlockLevel(skillId) {
    return SKILL_UNLOCK_LEVELS[skillId] || 1;
  }

  /**
   * Unlock skills when player levels up
   */
  checkUnlocksForLevel(playerLevel) {
    const newlyUnlocked = [];
    for (const [skillId, unlockLevel] of Object.entries(SKILL_UNLOCK_LEVELS)) {
      if (playerLevel >= unlockLevel && !this.unlockedSkills.has(skillId)) {
        this.unlockedSkills.add(skillId);
        newlyUnlocked.push(skillId);
      }
    }
    if (newlyUnlocked.length > 0) {
      this.saveToStorage();
    }
    return newlyUnlocked;
  }

  /**
   * Get current level of a skill (1-5)
   */
  getSkillLevel(skillId) {
    return this.skillLevels.get(skillId) || 1;
  }

  /**
   * Check if a skill can be upgraded
   */
  canUpgradeSkill(skillId) {
    if (!this.isSkillUnlocked(skillId)) return false;
    const currentLevel = this.getSkillLevel(skillId);
    return currentLevel < MAX_SKILL_LEVEL && this.skillPoints > 0;
  }

  /**
   * Upgrade a skill (costs 1 skill point)
   */
  upgradeSkill(skillId) {
    if (!this.canUpgradeSkill(skillId)) return false;
    
    const currentLevel = this.getSkillLevel(skillId);
    this.skillLevels.set(skillId, currentLevel + 1);
    this.skillPoints -= 1;
    this.saveToStorage();
    return true;
  }

  /**
   * Award skill points (called on level-up)
   */
  awardSkillPoints(amount = SKILL_POINTS_PER_LEVEL) {
    this.skillPoints += amount;
    this.saveToStorage();
  }

  /**
   * Get available skill points
   */
  getSkillPoints() {
    return this.skillPoints;
  }

  /**
   * Apply skill level bonuses to a skill's base stats
   */
  applyUpgradeBonuses(skillId, baseStats) {
    const level = this.getSkillLevel(skillId);
    if (level <= 1) return baseStats; // No bonuses at level 1

    const upgraded = { ...baseStats };
    const levelIndex = level - 1;

    // Apply damage bonus
    if (upgraded.dmg && SKILL_UPGRADE_BONUSES.damage[levelIndex]) {
      upgraded.dmg = Math.floor(upgraded.dmg * (1 + SKILL_UPGRADE_BONUSES.damage[levelIndex]));
    }

    // Apply cooldown reduction
    if (upgraded.cd && SKILL_UPGRADE_BONUSES.cooldown[levelIndex]) {
      upgraded.cd = Math.max(0.5, upgraded.cd * (1 - SKILL_UPGRADE_BONUSES.cooldown[levelIndex]));
    }

    // Apply range bonus
    if (upgraded.range && SKILL_UPGRADE_BONUSES.range[levelIndex]) {
      upgraded.range = Math.floor(upgraded.range * (1 + SKILL_UPGRADE_BONUSES.range[levelIndex]));
    }

    // Apply radius bonus
    if (upgraded.radius && SKILL_UPGRADE_BONUSES.radius[levelIndex]) {
      upgraded.radius = upgraded.radius * (1 + SKILL_UPGRADE_BONUSES.radius[levelIndex]);
    }

    // Apply duration bonus
    if (upgraded.duration && SKILL_UPGRADE_BONUSES.duration[levelIndex]) {
      upgraded.duration = upgraded.duration * (1 + SKILL_UPGRADE_BONUSES.duration[levelIndex]);
    }

    // Apply mana cost reduction
    if (upgraded.mana && SKILL_UPGRADE_BONUSES.mana[levelIndex]) {
      upgraded.mana = Math.max(1, Math.floor(upgraded.mana * (1 + SKILL_UPGRADE_BONUSES.mana[levelIndex])));
    }

    return upgraded;
  }

  /**
   * Get upgrade preview (what bonuses the next level will provide)
   */
  getUpgradePreview(skillId, baseStats) {
    const currentLevel = this.getSkillLevel(skillId);
    if (currentLevel >= MAX_SKILL_LEVEL) return null;

    const current = this.applyUpgradeBonuses(skillId, baseStats);
    
    // Temporarily upgrade to see next level stats
    const nextLevel = currentLevel + 1;
    this.skillLevels.set(skillId, nextLevel);
    const next = this.applyUpgradeBonuses(skillId, baseStats);
    this.skillLevels.set(skillId, currentLevel); // Restore

    return {
      currentLevel,
      nextLevel,
      current,
      next,
      improvements: {
        dmg: next.dmg && current.dmg ? next.dmg - current.dmg : 0,
        cd: next.cd && current.cd ? current.cd - next.cd : 0,
        range: next.range && current.range ? next.range - current.range : 0,
        radius: next.radius && current.radius ? next.radius - current.radius : 0,
        duration: next.duration && current.duration ? next.duration - current.duration : 0,
        mana: next.mana && current.mana ? current.mana - next.mana : 0,
      }
    };
  }

  /**
   * Reset all skill levels (for testing or respec)
   */
  resetSkills() {
    // Refund all spent points
    let totalSpent = 0;
    for (const level of this.skillLevels.values()) {
      totalSpent += (level - 1);
    }
    this.skillPoints += totalSpent;
    this.skillLevels.clear();
    this.saveToStorage();
  }

  /**
   * Save to localStorage
   */
  saveToStorage() {
    try {
      const levelsObj = Object.fromEntries(this.skillLevels);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(levelsObj));
      localStorage.setItem(STORAGE_KEY_POINTS, String(this.skillPoints));
      localStorage.setItem(STORAGE_KEY_UNLOCKED, JSON.stringify([...this.unlockedSkills]));
    } catch (e) {
      console.warn("Failed to save skill upgrades:", e);
    }
  }

  /**
   * Load from localStorage
   */
  loadFromStorage() {
    try {
      // Load skill levels
      const levelsRaw = localStorage.getItem(STORAGE_KEY);
      if (levelsRaw) {
        const levelsObj = JSON.parse(levelsRaw);
        this.skillLevels = new Map(Object.entries(levelsObj));
      }

      // Load skill points
      const pointsRaw = localStorage.getItem(STORAGE_KEY_POINTS);
      if (pointsRaw) {
        this.skillPoints = parseInt(pointsRaw, 10) || 0;
      }

      // Load unlocked skills
      const unlockedRaw = localStorage.getItem(STORAGE_KEY_UNLOCKED);
      if (unlockedRaw) {
        const unlockedArray = JSON.parse(unlockedRaw);
        this.unlockedSkills = new Set(unlockedArray);
      }
    } catch (e) {
      console.warn("Failed to load skill upgrades:", e);
    }
  }
}

/**
 * Global instance (singleton pattern)
 */
let globalInstance = null;

export function getSkillUpgradeManager() {
  if (!globalInstance) {
    globalInstance = new SkillUpgradeManager();
  }
  return globalInstance;
}