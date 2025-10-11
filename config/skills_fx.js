/**
 * Visual FX Configuration per Skill
 * 
 * This file defines the complete visual configuration for each skill.
 * Each skill has its own unique configuration that can include:
 * - colors: Primary, secondary, accent colors for the effect
 * - size: Scale factors for various visual elements
 * - particles: Particle system configuration
 * - intensity: Visual intensity multipliers
 * - custom: Any skill-specific parameters
 * 
 * The actual effect implementations are in src/effects/{skill_id}.js
 */
export const SKILL_FX = Object.freeze({
  // ===== CHAIN SKILLS =====
  flame_chain: {
    colors: {
      primary: "#ff4500",      // Orange-red flames
      secondary: "#ff6347",    // Tomato red
      accent: "#ffd700",       // Gold sparks
      glow: "#ff8c00"          // Dark orange glow
    },
    size: {
      chain: 0.3,              // Chain link thickness
      impact: 1.5,             // Impact explosion size
      sparks: 0.15             // Spark particle size
    },
    particles: {
      count: 20,               // Particles per chain link
      speed: 2.5,
      lifetime: 0.8
    },
    intensity: 1.2,
    shake: 0.2,
    custom: {
      chainAmplitude: 0.6,     // Wave amplitude for chain arcs
      lightningBranches: 3     // Number of lightning branches
    }
  },

  // ===== AOE BLAST SKILLS =====
  inferno_blast: {
    colors: {
      primary: "#ff4500",      // Orange-red core
      secondary: "#ff6347",    // Tomato flames
      accent: "#ffff00",       // Yellow flash
      smoke: "#2a2a2a"         // Dark smoke
    },
    size: {
      core: 2.0,               // Explosion core size
      shockwave: 3.5,          // Shockwave radius multiplier
      flames: 1.8              // Flame height
    },
    particles: {
      count: 50,               // Explosion particles
      speed: 8.0,
      lifetime: 1.2
    },
    intensity: 1.8,
    shake: 0.35,
    custom: {
      shockwaveRings: 3,       // Number of expanding rings
      fireColumns: 8           // Vertical fire columns
    }
  },

  // ===== AURA SKILLS =====
  burning_aura: {
    colors: {
      primary: "#ff8c00",      // Dark orange
      secondary: "#ffa500",    // Orange
      accent: "#ff6347",       // Tomato
      ember: "#ff4500"         // Orange-red embers
    },
    size: {
      aura: 1.0,               // Aura radius multiplier
      flames: 0.8,             // Flame size
      embers: 0.12             // Ember particle size
    },
    particles: {
      count: 30,               // Floating embers
      speed: 1.5,
      lifetime: 2.0
    },
    intensity: 0.8,
    shake: 0.1,
    custom: {
      pulseRate: 2.0,          // Aura pulse frequency
      flameRings: 2,           // Concentric flame rings
      emberDensity: 1.5        // Ember spawn rate
    }
  },

  blazing_aura: {
    colors: {
      primary: "#ffd700",      // Gold (hotter)
      secondary: "#ffa500",    // Orange
      accent: "#ffff00",       // Yellow
      core: "#ffffff"          // White hot core
    },
    size: {
      aura: 1.2,
      flames: 1.0,
      core: 0.5
    },
    particles: {
      count: 40,
      speed: 2.0,
      lifetime: 1.8
    },
    intensity: 1.2,
    shake: 0.18,
    custom: {
      pulseRate: 3.0,
      flameRings: 3,
      heatDistortion: 1.5      // Heat wave effect intensity
    }
  },

  scorching_field: {
    colors: {
      primary: "#ff6347",      // Tomato
      secondary: "#ff8c00",    // Dark orange
      accent: "#ff4500",       // Orange-red
      ground: "#8b0000"        // Dark red ground burn
    },
    size: {
      field: 1.0,
      flames: 0.9,
      cracks: 0.3              // Ground crack size
    },
    particles: {
      count: 35,
      speed: 1.2,
      lifetime: 2.5
    },
    intensity: 1.0,
    shake: 0.15,
    custom: {
      groundCracks: 12,        // Number of burning cracks
      flameSpouts: 8,          // Flame spout locations
      heatWaves: true          // Enable heat distortion
    }
  },

  inferno_overload: {
    colors: {
      primary: "#ff4500",      // Orange-red (intense)
      secondary: "#ff6347",    // Tomato
      accent: "#ffd700",       // Gold
      explosion: "#ffff00"     // Yellow explosion
    },
    size: {
      aura: 1.5,
      explosion: 2.5,
      flames: 1.3
    },
    particles: {
      count: 60,
      speed: 4.0,
      lifetime: 1.5
    },
    intensity: 2.0,
    shake: 0.2,
    custom: {
      pulseRate: 4.0,
      explosionWaves: 4,       // Expanding explosion rings
      fireSpirals: 6           // Spiraling fire streams
    }
  },

  // ===== STORM SKILLS =====
  meteor_storm: {
    colors: {
      primary: "#ff4500",      // Orange-red meteor
      secondary: "#ff6347",    // Tomato trail
      accent: "#8b0000",       // Dark red
      impact: "#ffff00"        // Yellow impact flash
    },
    size: {
      meteor: 1.2,             // Meteor size
      trail: 0.4,              // Trail width
      crater: 2.0              // Impact crater size
    },
    particles: {
      count: 40,               // Debris per meteor
      speed: 6.0,
      lifetime: 1.0
    },
    intensity: 2.0,
    shake: 0.45,
    custom: {
      meteorSpeed: 25,         // Fall speed
      trailLength: 8,          // Trail segments
      craterGlow: 1.5,         // Crater glow duration
      shockwaveRings: 3
    }
  },

  volcanic_wrath: {
    colors: {
      primary: "#ff4500",      // Orange-red lava
      secondary: "#8b0000",    // Dark red
      accent: "#ffd700",       // Gold sparks
      smoke: "#1a1a1a"         // Black smoke
    },
    size: {
      volcano: 2.0,            // Volcano cone size
      lava: 1.5,               // Lava blob size
      smoke: 3.0               // Smoke cloud size
    },
    particles: {
      count: 70,
      speed: 5.0,
      lifetime: 2.0
    },
    intensity: 2.5,
    shake: 0.35,
    custom: {
      lavaFountains: 5,        // Number of lava fountains
      smokeColumns: 8,         // Smoke pillar count
      lavaBombs: 12            // Lava projectiles
    }
  },

  fire_dome: {
    colors: {
      primary: "#ff6347",      // Tomato
      secondary: "#ff4500",    // Orange-red
      accent: "#ffd700",       // Gold
      shield: "#ff8c00"        // Dark orange shield
    },
    size: {
      dome: 1.0,               // Dome radius multiplier
      pillars: 2.5,            // Pillar height
      shield: 0.8              // Shield thickness
    },
    particles: {
      count: 80,
      speed: 3.0,
      lifetime: 3.0
    },
    intensity: 2.0,
    shake: 0.6,
    custom: {
      domePillars: 16,         // Pillars forming dome
      rotationSpeed: 1.5,      // Dome rotation
      pulseRate: 2.5,
      shieldLayers: 3          // Layered shield effect
    }
  },

  lava_storm: {
    colors: {
      primary: "#ff4500",      // Orange-red lava
      secondary: "#8b0000",    // Dark red
      accent: "#ffa500",       // Orange
      crust: "#2a1a0a"         // Dark crust
    },
    size: {
      lavaPool: 1.5,
      geysers: 2.0,
      splashes: 1.0
    },
    particles: {
      count: 60,
      speed: 4.5,
      lifetime: 1.8
    },
    intensity: 2.2,
    shake: 0.38,
    custom: {
      geyserCount: 10,         // Lava geysers
      poolBubbles: 20,         // Bubbling lava
      splashArcs: 8            // Lava splash directions
    }
  },

  // ===== PROJECTILE/BEAM SKILLS =====
  fire_bolt: {
    colors: {
      primary: "#ff6347",      // Tomato beam
      secondary: "#ffa500",    // Orange
      accent: "#ffd700",       // Gold sparks
      trail: "#ff8c00"         // Dark orange trail
    },
    size: {
      bolt: 0.3,               // Bolt thickness
      impact: 1.2,
      trail: 0.2
    },
    particles: {
      count: 15,
      speed: 2.0,
      lifetime: 0.6
    },
    intensity: 1.0,
    shake: 0.2,
    custom: {
      boltSegments: 8,         // Segmented bolt effect
      sparkCount: 12,          // Trailing sparks
      pierceEffect: true       // Piercing visual
    }
  },

  fireball: {
    colors: {
      primary: "#ff6347",      // Tomato core
      secondary: "#ffa500",    // Orange flames
      accent: "#ff4500",       // Orange-red outer
      explosion: "#ffff00"     // Yellow explosion
    },
    size: {
      ball: 0.6,               // Fireball size
      trail: 0.4,
      explosion: 2.0
    },
    particles: {
      count: 25,
      speed: 3.0,
      lifetime: 1.0
    },
    intensity: 1.3,
    shake: 0.22,
    custom: {
      rotation: 5.0,           // Fireball spin rate
      trailDensity: 2.0,       // Trail particle density
      explosionRings: 3
    }
  },

  flame_spear: {
    colors: {
      primary: "#ff4500",      // Orange-red spear
      secondary: "#ff6347",    // Tomato
      accent: "#ffd700",       // Gold tip
      trail: "#ffa500"         // Orange trail
    },
    size: {
      spear: 0.8,              // Spear length multiplier
      tip: 0.4,                // Spear tip size
      trail: 0.3
    },
    particles: {
      count: 20,
      speed: 4.0,
      lifetime: 0.8
    },
    intensity: 1.5,
    shake: 0.28,
    custom: {
      spearLength: 3.0,        // Spear model length
      tipGlow: 2.0,            // Tip glow intensity
      spiralTrail: true,       // Spiral trail effect
      pierceDepth: 1.5         // Pierce-through effect
    }
  },

  heatwave: {
    colors: {
      primary: "#ff8c00",      // Dark orange
      secondary: "#ffa500",    // Orange
      accent: "#ff6347",       // Tomato
      distortion: "#ffaa00"    // Heat distortion color
    },
    size: {
      wave: 1.5,               // Wave height
      width: 2.0,              // Wave width
      distortion: 3.0          // Distortion area
    },
    particles: {
      count: 40,
      speed: 2.5,
      lifetime: 1.5
    },
    intensity: 1.4,
    shake: 0.3,
    custom: {
      waveSpeed: 15,           // Wave travel speed
      ripples: 5,              // Wave ripple count
      heatDistortion: 2.0,     // Distortion intensity
      groundScorch: true       // Leave scorch marks
    }
  },

  // ===== NOVA/RING SKILLS =====
  flame_nova: {
    colors: {
      primary: "#ff6347",      // Tomato
      secondary: "#ff4500",    // Orange-red
      accent: "#ffd700",       // Gold
      core: "#ffff00"          // Yellow core
    },
    size: {
      core: 1.0,               // Nova core size
      ring: 1.5,               // Expanding ring size
      flames: 1.2              // Flame burst size
    },
    particles: {
      count: 60,
      speed: 8.0,
      lifetime: 1.2
    },
    intensity: 2.0,
    shake: 0.35,
    custom: {
      expansionSpeed: 12,      // Ring expansion speed
      flameRays: 16,           // Radial flame rays
      pulseWaves: 3,           // Pulse wave count
      coreExplosion: true      // Central explosion
    }
  },

  flame_ring: {
    colors: {
      primary: "#ff6347",      // Tomato
      secondary: "#ff4500",    // Orange-red
      accent: "#ffa500",       // Orange
      inner: "#ffd700"         // Gold inner ring
    },
    size: {
      ring: 1.0,
      thickness: 0.5,
      flames: 1.0
    },
    particles: {
      count: 45,
      speed: 3.5,
      lifetime: 1.5
    },
    intensity: 1.5,
    shake: 0.32,
    custom: {
      ringLayers: 3,           // Concentric rings
      flameSpouts: 12,         // Flames around ring
      rotation: 2.0,           // Ring rotation speed
      pulseRate: 3.0
    }
  },

  ember_burst: {
    colors: {
      primary: "#ffa500",      // Orange
      secondary: "#ff8c00",    // Dark orange
      accent: "#ff6347",       // Tomato
      ember: "#ff4500"         // Orange-red embers
    },
    size: {
      burst: 1.2,
      embers: 0.15,
      glow: 0.8
    },
    particles: {
      count: 80,               // Many small embers
      speed: 6.0,
      lifetime: 2.0
    },
    intensity: 1.6,
    shake: 0.28,
    custom: {
      emberCount: 100,         // Total ember particles
      burstDirections: 24,     // Radial burst directions
      floatEffect: true,       // Embers float upward
      glowPulse: 2.5
    }
  },

  pyroclasm: {
    colors: {
      primary: "#ff4500",      // Orange-red (massive)
      secondary: "#8b0000",    // Dark red
      accent: "#ffd700",       // Gold
      explosion: "#ffff00"     // Yellow explosion
    },
    size: {
      explosion: 3.0,          // Massive explosion
      shockwave: 4.0,
      debris: 1.5
    },
    particles: {
      count: 100,              // Maximum particles
      speed: 10.0,
      lifetime: 2.5
    },
    intensity: 3.0,
    shake: 0.4,
    custom: {
      explosionStages: 3,      // Multi-stage explosion
      shockwaveRings: 5,       // Multiple shockwaves
      debrisCount: 50,         // Flying debris
      craterSize: 3.0,         // Impact crater
      fireColumns: 12,         // Vertical fire columns
      groundCracks: 20         // Radiating cracks
    }
  }
});

/**
 * Get FX configuration for a skill, with fallback to default fire effect
 */
export function getSkillFX(skillId) {
  return SKILL_FX[skillId] || {
    colors: {
      primary: "#ff6347",
      secondary: "#ffa500",
      accent: "#ff4500",
      glow: "#ff8c00"
    },
    size: {
      default: 1.0
    },
    particles: {
      count: 20,
      speed: 3.0,
      lifetime: 1.0
    },
    intensity: 1.0,
    shake: 0.2,
    custom: {}
  };
}