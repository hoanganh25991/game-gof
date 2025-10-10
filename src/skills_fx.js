/**
 * Visual FX configuration per skill id.
 * 
 * This file defines the color palette and visual intensity for each skill.
 * The actual effect implementations are in effects_registry.js
 * 
 * Each skill can define:
 * - beam: Color for beam/projectile effects
 * - arc: Color for arcing/chaining effects
 * - impact: Color for impact/explosion effects
 * - ring: Color for ground rings and AoE indicators
 * - hand: Color for hand/casting flash effects
 * - shake: Camera shake intensity (0-1)
 */
export const SKILL_FX = Object.freeze({
  // ===== CHAIN SKILLS =====
  flame_chain: {
    beam: "#ff6347",    // Tomato red for initial beam
    arc: "#ff4500",     // Orange-red for chain arcs
    impact: "#ffa500",  // Orange for impacts
    ring: "#ff8c00",    // Dark orange for rings
    hand: "#ff6347",    // Tomato for hand flash
    shake: 0.2
  },

  // ===== AOE BLAST SKILLS =====
  inferno_blast: {
    beam: "#ff4500",    // Orange-red beams
    arc: "#ff6347",     // Tomato arcs
    impact: "#ffa500",  // Orange impacts
    ring: "#ff4500",    // Orange-red ring
    hand: "#ff8c00",    // Dark orange hand
    shake: 0.35
  },

  // ===== AURA SKILLS =====
  burning_aura: {
    beam: "#ff8c00",    // Dark orange
    arc: "#ffa500",     // Orange
    impact: "#ff6347",  // Tomato impacts
    ring: "#ff8c00",    // Dark orange ring
    hand: "#ffa500",    // Orange hand
    shake: 0.1
  },

  blazing_aura: {
    beam: "#ffd700",    // Gold beams (hotter)
    arc: "#ffa500",     // Orange arcs
    impact: "#ffa500",  // Orange impacts
    ring: "#ffd700",    // Gold ring
    hand: "#ff8c00",    // Dark orange hand
    shake: 0.18
  },

  scorching_field: {
    beam: "#ff6347",    // Tomato beams
    arc: "#ff8c00",     // Dark orange arcs
    impact: "#ff4500",  // Orange-red impacts
    ring: "#ff6347",    // Tomato ring
    hand: "#ffa500",    // Orange hand
    shake: 0.15
  },

  inferno_overload: {
    beam: "#ff4500",    // Orange-red beams (intense)
    arc: "#ff6347",     // Tomato arcs
    impact: "#ff8c00",  // Dark orange impacts
    ring: "#ff4500",    // Orange-red ring
    hand: "#ffa500",    // Orange hand
    shake: 0.2
  },

  // ===== STORM SKILLS =====
  meteor_storm: {
    beam: "#ff4500",    // Orange-red meteors
    arc: "#ff6347",     // Tomato arcs
    impact: "#ff4500",  // Orange-red impacts
    ring: "#ff6347",    // Tomato ring
    hand: "#ffa500",    // Orange hand
    shake: 0.45
  },

  volcanic_wrath: {
    beam: "#ff4500",    // Orange-red lava
    arc: "#ff6347",     // Tomato arcs
    impact: "#ff4500",  // Orange-red impacts
    ring: "#ff6347",    // Tomato ring
    hand: "#ffa500",    // Orange hand
    shake: 0.35
  },

  fire_dome: {
    beam: "#ff6347",    // Tomato beams
    arc: "#ff4500",     // Orange-red arcs
    impact: "#ff6347",  // Tomato impacts
    ring: "#ff4500",    // Orange-red ring
    hand: "#ffa500",    // Orange hand
    shake: 0.6
  },

  lava_storm: {
    beam: "#ff4500",    // Orange-red lava
    arc: "#ff6347",     // Tomato arcs
    impact: "#ff4500",  // Orange-red impacts
    ring: "#ff6347",    // Tomato ring
    hand: "#ffa500",    // Orange hand
    shake: 0.38
  },

  // ===== PROJECTILE/BEAM SKILLS =====
  fire_bolt: {
    beam: "#ff6347",    // Tomato beam
    arc: "#ffa500",     // Orange arcs
    impact: "#ffa500",  // Orange impact
    ring: "#ff8c00",    // Dark orange ring
    hand: "#ff8c00",    // Dark orange hand
    shake: 0.2
  },

  fireball: {
    beam: "#ff6347",    // Tomato projectile
    arc: "#ffa500",     // Orange arcs
    impact: "#ffa500",  // Orange impact
    ring: "#ff8c00",    // Dark orange ring
    hand: "#ff8c00",    // Dark orange hand
    shake: 0.22
  },

  flame_spear: {
    beam: "#ff4500",    // Orange-red spear
    arc: "#ff6347",     // Tomato arcs
    impact: "#ffa500",  // Orange impact
    ring: "#ff8c00",    // Dark orange ring
    hand: "#ff6347",    // Tomato hand
    shake: 0.28
  },

  heatwave: {
    beam: "#ff8c00",    // Dark orange wave
    arc: "#ffa500",     // Orange arcs
    impact: "#ffa500",  // Orange impact
    ring: "#ff6347",    // Tomato ring
    hand: "#ff6347",    // Tomato hand
    shake: 0.3
  },

  // ===== NOVA/RING SKILLS =====
  flame_nova: {
    beam: "#ff6347",    // Tomato beams
    arc: "#ff4500",     // Orange-red arcs
    impact: "#ffa500",  // Orange impacts
    ring: "#ff4500",    // Orange-red ring
    hand: "#ff6347",    // Tomato hand
    shake: 0.35
  },

  flame_ring: {
    beam: "#ff6347",    // Tomato beams
    arc: "#ff4500",     // Orange-red arcs
    impact: "#ffa500",  // Orange impacts
    ring: "#ff6347",    // Tomato ring
    hand: "#ff8c00",    // Dark orange hand
    shake: 0.32
  },

  ember_burst: {
    beam: "#ffa500",    // Orange beams
    arc: "#ff8c00",     // Dark orange arcs
    impact: "#ff8c00",  // Dark orange impacts
    ring: "#ffa500",    // Orange ring
    hand: "#ff6347",    // Tomato hand
    shake: 0.28
  },

  pyroclasm: {
    beam: "#ff4500",    // Orange-red beams (massive)
    arc: "#ff6347",     // Tomato arcs
    impact: "#ffa500",  // Orange impacts
    ring: "#ff4500",    // Orange-red ring
    hand: "#ff6347",    // Tomato hand
    shake: 0.4
  }
});

/**
 * Get FX configuration for a skill, with fallback to default fire colors
 */
export function getSkillFX(skillId) {
  return SKILL_FX[skillId] || {
    beam: "#ff6347",
    arc: "#ff4500",
    impact: "#ffa500",
    ring: "#ff8c00",
    hand: "#ff6347",
    shake: 0.2
  };
}