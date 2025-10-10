import * as THREE from "../vendor/three/build/three.module.js";
import { COLOR } from "./constants.js";
import { SKILL_FX } from "./skills_fx.js";
import { SKILLS_POOL } from "./skills_pool.js";

/**
 * Dynamic Effects Loader
 * 
 * Automatically loads effect implementations from the effects/ directory.
 * Each effect file should export a default function with signature:
 *   (baseEffects, params) => void
 * 
 * File naming convention: {skill_id}.js
 * 
 * Benefits:
 * - No need to modify registry when adding new effects
 * - Just drop a file into effects/ directory
 * - Automatic registration based on filename
 * - Graceful fallback for missing effects
 */

const effectsRegistry = {};
let isLoaded = false;

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
  
  console.warn(`[EffectsLoader] No custom effect for skill "${params.skillId}", using default`);
  
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
 * Load all effect implementations from the effects/ directory
 * This is called automatically on first use
 */
async function loadEffects() {
  if (isLoaded) return;
  
  console.log('[EffectsLoader] Loading effect implementations...');
  
  // Get all skill IDs from the pool
  const skillIds = SKILLS_POOL.map(skill => skill.id);
  
  // Try to load each effect file
  for (const skillId of skillIds) {
    try {
      // Dynamic import of effect file
      const module = await import(`./effects/${skillId}.js`);
      
      if (module.default && typeof module.default === 'function') {
        effectsRegistry[skillId] = module.default;
        console.log(`[EffectsLoader] ✓ Loaded effect: ${skillId}`);
      } else {
        console.warn(`[EffectsLoader] ✗ Invalid effect export for: ${skillId}`);
      }
    } catch (error) {
      // Effect file doesn't exist - this is OK, will use default
      // Only log in development
      if (error.message.includes('Failed to fetch') || error.message.includes('Cannot find')) {
        // Silent - effect not implemented yet
      } else {
        console.error(`[EffectsLoader] Error loading effect "${skillId}":`, error);
      }
    }
  }
  
  const loadedCount = Object.keys(effectsRegistry).length;
  const totalCount = skillIds.length;
  console.log(`[EffectsLoader] Loaded ${loadedCount}/${totalCount} custom effects`);
  
  // Warn about missing effect files
  const missing = skillIds.filter(id => !effectsRegistry[id]);
  if (missing.length) {
    console.warn('[EffectsLoader] Missing effect implementations for:', missing.join(', '));
  }

  isLoaded = true;
  return effectsRegistry;
}

/**
 * Execute a skill effect by ID
 * Automatically loads effects on first call
 * 
 * @param {string} skillId - The skill identifier
 * @param {BaseEffects} baseEffects - The base effects manager
 * @param {object} params - Effect parameters
 */
export async function executeSkillEffect(skillId, baseEffects, params) {
  // Load effects on first use
  if (!isLoaded) {
    await loadEffects();
  }
  
  if (!skillId) {
    console.warn('[EffectsLoader] No skillId provided');
    return;
  }
  
  const effectFn = effectsRegistry[skillId];
  
  if (effectFn) {
    try {
      effectFn(baseEffects, { ...params, skillId });
    } catch (error) {
      console.error(`[EffectsLoader] Error executing effect for "${skillId}":`, error);
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
  return !!effectsRegistry[skillId];
}

/**
 * Manually register a skill effect at runtime
 * Useful for plugins or dynamic effects
 */
export function registerSkillEffect(skillId, effectFn) {
  if (typeof effectFn !== 'function') {
    console.error(`[EffectsLoader] Effect for "${skillId}" must be a function`);
    return false;
  }
  effectsRegistry[skillId] = effectFn;
  console.log(`[EffectsLoader] Registered custom effect: ${skillId}`);
  return true;
}

/**
 * Get all registered skill effect IDs
 */
export function getRegisteredSkillEffects() {
  return Object.keys(effectsRegistry);
}

/**
 * Force reload all effects (useful for development)
 */
export async function reloadEffects() {
  isLoaded = false;
  Object.keys(effectsRegistry).forEach(key => delete effectsRegistry[key]);
  await loadEffects();
}

/**
 * Preload all effects (call during game initialization)
 */
export async function preloadEffects() {
  return await loadEffects();
}