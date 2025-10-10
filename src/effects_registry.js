import * as THREE from "../vendor/three/build/three.module.js";
import { COLOR } from "./constants.js";
import { SKILL_FX } from "./skills_fx.js";
import { SKILL_DOCS } from "./skills_docs.js";
import { SKILLS_POOL } from "./skills_pool.js";

/**
 * Skill Effects Registry
 * 
 * Maps skill IDs to their visual effect implementations.
 * Each skill effect is a function that receives the base effects manager and skill-specific parameters.
 * 
 * This registry pattern allows:
 * - No hardcoded method names in effects.js
 * - Easy addition of new skill effects
 * - Graceful fallback for skills without custom effects
 * - Separation of concerns between base effects and skill-specific visuals
 */

const __vA = new THREE.Vector3();
const __vB = new THREE.Vector3();
const __vC = new THREE.Vector3();

/**
 * Get effect colors for a skill
 */
function getSkillColors(skillId) {
  const fx = SKILL_FX[skillId] || {};
  return {
    beam: fx.beam ?? COLOR.fire,
    arc: fx.arc ?? COLOR.accent,
    impact: fx.impact ?? COLOR.fire,
    ring: fx.ring ?? COLOR.ember,
    hand: fx.hand ?? COLOR.ember,
    shake: fx.shake ?? 0.2
  };
}

/**
 * Default effect for skills without custom implementation
 */
function defaultSkillEffect(baseEffects, params) {
  const { from, to, center, radius } = params;
  const colors = getSkillColors(params.skillId);
  
  console.warn(`[EffectsRegistry] No custom effect for skill "${params.skillId}", using default`);
  
  // Simple default: beam + impact
  if (from && to) {
    baseEffects.spawnBeam(from, to, colors.beam, 0.15);
    baseEffects.spawnImpact(to, 1.5, colors.impact);
  } else if (center) {
    baseEffects.spawnImpact(center, radius || 2, colors.impact);
    baseEffects.spawnRing(center, radius || 3, colors.ring, 0.4);
  }
}

/**
 * Skill Effect Implementations
 * Each function receives (baseEffects, params) where params contains:
 * - skillId: the skill identifier
 * - player: the casting entity
 * - from: source position (Vector3)
 * - to: target position (Vector3)
 * - center: center position for AoE (Vector3)
 * - radius: effect radius
 * - targets: array of affected entities
 * - Any other skill-specific data
 */
// The SKILL_EFFECTS map is intentionally empty here —
// effect implementations live in dedicated files under src/effects and are
// dynamically loaded at runtime. Use registerSkillEffect(skillId, fn)
// to register additional effects programmatically.
const SKILL_EFFECTS = {};

// Dynamically discover and load modular effects from ./effects directory.
// Preferred: use build-time globbing (import.meta.glob) when available (Vite/Rollup).
// Fallback: attempt dynamic import for a list of known filenames.
// Load modular effects for skills present in SKILLS_POOL. Export a promise
// so callers (e.g. main.js) can await effects to be registered before usage.
export const effectsReady = (async function loadModularEffects() {
  try {
    // Build set of skill IDs to load from SKILLS_POOL
    const skillIds = Array.from(new Set((SKILLS_POOL || []).map(s => s.id).filter(Boolean)));

    // Detect whether import.meta.glob is available (build-time bundlers)
    let hasGlob = false;
    try {
      hasGlob = !!(import.meta && import.meta.glob);
    } catch (e) {
      hasGlob = false;
    }

    if (hasGlob) {
      const modules = import.meta.glob('./effects/*.js');
      const matchingPaths = Object.keys(modules).filter(path => {
        const name = path.replace(/^\.\/effects\//, '').replace(/\.js$/, '');
        return skillIds.includes(name);
      });
      await Promise.all(matchingPaths.map(async path => {
        try {
          const mod = await modules[path]();
          const name = path.replace(/^\.\/effects\//, '').replace(/\.js$/, '');
          const fn = mod && (mod.default || mod);
          if (typeof fn === 'function') SKILL_EFFECTS[name] = fn;
        } catch (e) {
          console.warn('[EffectsRegistry] Failed to import', path, e);
        }
      }));
      return SKILL_EFFECTS;
    }

    // Fallback: dynamic import only for skills defined in SKILLS_POOL
    await Promise.all(skillIds.map(async name => {
      try {
        const mod = await import(`./effects/${name}.js`);
        const fn = mod && (mod.default || mod);
        if (typeof fn === 'function') SKILL_EFFECTS[name] = fn;
      } catch (e) {
        // If a module file isn't present, warn once so developer can add it.
        console.warn(`[EffectsRegistry] Effect file not found for "${name}" at ./effects/${name}.js`);
      }
    }));
  } catch (err) {
    console.warn('[EffectsRegistry] Error loading modular effects:', err);
  }
  return SKILL_EFFECTS;
})();

/**
 * Execute a skill effect by ID
 * @param {string} skillId - The skill identifier
 * @param {BaseEffects} baseEffects - The base effects manager
 * @param {object} params - Effect parameters
 */
export function executeSkillEffect(skillId, baseEffects, params) {
  if (!skillId) {
    console.warn('[EffectsRegistry] No skillId provided');
    return;
  }
  
  const effectFn = SKILL_EFFECTS[skillId];
  
  if (effectFn) {
    try {
      effectFn(baseEffects, { ...params, skillId });
    } catch (error) {
      console.error(`[EffectsRegistry] Error executing effect for "${skillId}":`, error);
      defaultSkillEffect(baseEffects, { ...params, skillId });
    }
  } else {
    defaultSkillEffect(baseEffects, { ...params, skillId });
  }
}

/**
 * Check if a skill has a custom effect registered
 */
export function hasSkillEffect(skillId) {
  return !!SKILL_EFFECTS[skillId];
}

/**
 * Register a new skill effect at runtime
 */
export function registerSkillEffect(skillId, effectFn) {
  if (typeof effectFn !== 'function') {
    console.error(`[EffectsRegistry] Effect for "${skillId}" must be a function`);
    return false;
  }
  SKILL_EFFECTS[skillId] = effectFn;
  return true;
}

/**
 * Get all registered skill effect IDs
 */
export function getRegisteredSkillEffects() {
  return Object.keys(SKILL_EFFECTS);
}