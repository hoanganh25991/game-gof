/**
 * Visual FX configuration per skill id.
 * Moved out of skills_pool.js to keep core definitions simple.
 * Values are strings so they can be consumed by normalizeColor/parseThreeColor.
 */
export const SKILL_FX = Object.freeze({
  flame_chain: {
    beam: "0xff6347",
    arc: "0xff4500",
    impact: "0xffa500",
    ring: "0xff8c00",
    hand: "0xff6347",
    shake: 0.2
  },
  inferno_blast: {
    ring: "0xff4500",
    impact: "0xffa500",
    arc: "0xff6347",
    hand: "0xff8c00",
    shake: 0.35
  },
  burning_aura: {
    ring: "0xff8c00",
    impact: "0xff6347",
    hand: "0xffa500",
    shake: 0.1
  },
  meteor_storm: {
    impact: "0xff4500",
    ring: "0xff6347",
    hand: "0xffa500",
    shake: 0.45
  },
  fire_bolt: {
    beam: "0xff6347",
    impact: "0xffa500",
    hand: "0xff8c00",
    shake: 0.2
  },
  flame_nova: {
    ring: "0xff4500",
    impact: "0xffa500",
    hand: "0xff6347",
    shake: 0.35
  },
  blazing_aura: {
    ring: "0xffd700",
    impact: "0xffa500",
    hand: "0xff8c00",
    shake: 0.18
  },
  scorching_field: {
    ring: "0xff6347",
    impact: "0xff4500",
    hand: "0xffa500",
    shake: 0.15
  },
  inferno_overload: {
    ring: "0xff4500",
    impact: "0xff8c00",
    hand: "0xffa500",
    shake: 0.2
  },
  fireball: {
    beam: "0xff6347",
    impact: "0xffa500",
    hand: "0xff8c00",
    shake: 0.22
  },
  flame_spear: {
    beam: "0xff4500",
    impact: "0xffa500",
    hand: "0xff6347",
    shake: 0.28
  },
  heatwave: {
    beam: "0xff8c00",
    impact: "0xffa500",
    hand: "0xff6347",
    shake: 0.3
  },
  volcanic_wrath: {
    impact: "0xff4500",
    ring: "0xff6347",
    hand: "0xffa500",
    shake: 0.35
  },
  fire_dome: {
    impact: "0xff6347",
    ring: "0xff4500",
    hand: "0xffa500",
    shake: 0.6
  },
  lava_storm: {
    impact: "0xff4500",
    ring: "0xff6347",
    hand: "0xffa500",
    shake: 0.38
  },
  flame_ring: {
    ring: "0xff6347",
    impact: "0xffa500",
    hand: "0xff8c00",
    shake: 0.32
  },
  ember_burst: {
    ring: "0xffa500",
    impact: "0xff8c00",
    hand: "0xff6347",
    shake: 0.28
  },
  pyroclasm: {
    ring: "0xff4500",
    impact: "0xffa500",
    hand: "0xff6347",
    shake: 0.4
  }
});
