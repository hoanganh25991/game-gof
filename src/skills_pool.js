/**
 * God of Fire Skill Pool — Fire-themed skills with per-skill VFX "effects"
 *
 * effects:
 *  - beam: fire beam/projectile color (hex)
 *  - impact: explosion/burn color (hex)
 *  - ring: ground ring/fire circle color (hex)
 *  - arc: secondary flame arc color (hex)
 *  - hand: hand flash tint (hex)
 *  - shake: camera shake magnitude (0..1)
 */
export const SKILL_POOL = [
  {
    "id": "flame_chain",
    "name": "Flame Chain",
    "short": "Chain",
    "icon": "🔗",
    "type": "chain",
    "cd": 5,
    "mana": 22,
    "range": 45,
    "jumps": 5,
    "jumpRange": 24,
    "dmg": 24,
    "slowFactor": 0.25,
    "slowDuration": 0.9,
    "effects": {
      "beam": "0xff6347",
      "arc": "0xff4500",
      "impact": "0xffa500",
      "ring": "0xff8c00",
      "hand": "0xff6347",
      "shake": 0.2
    },
    "description": "Ignite an enemy and spread flames to nearby foes, burning each struck target.",
    "behavior": "On cast:\n- Validate an initial enemy target within range and LoS from the caster's aim reticle; if none, fail (no cost).\n- Play effects.hand on caster.\n- Hit the initial target for dmg fire, apply slow (slowFactor, slowDuration). Play effects.impact at target and camera shake with effects.shake.\n- Draw a flame beam from caster to target using effects.beam.\n- Chain logic:\n - Maintain a set of already-hit targets (start with the initial target).\n - For up to jumps additional hits:\n - Find the nearest enemy to the last hit target within jumpRange and LoS that is not yet hit and is alive.\n - If none found, stop chaining.\n - Travel time is instantaneous; draw effects.arc between the last target and the new target and play effects.impact on hit.\n - Apply dmg and the same slow to the new target; add to hit set.\n- No damage falloff between jumps by default.\n- Apply no friendly fire; ignores dead/untargetable units."
  },
  {
    "id": "inferno_blast",
    "name": "Inferno Blast",
    "short": "Blast",
    "icon": "💥",
    "type": "aoe",
    "cd": 8,
    "mana": 34,
    "radius": 16,
    "dmg": 35,
    "slowFactor": 0.45,
    "slowDuration": 1.5,
    "effects": {
      "ring": "0xff4500",
      "impact": "0xffa500",
      "arc": "0xff6347",
      "hand": "0xff8c00",
      "shake": 0.35
    },
    "description": "Unleash a fiery explosion around you, damaging and heavily burning enemies.",
    "behavior": "On cast:\n- Centered on the caster, create an immediate AoE with radius.\n- Play effects.hand on caster and effects.ring expanding from caster; flash effects.impact on each enemy hit.\n- All enemies within radius take dmg fire and are slowed by slowFactor for slowDuration.\n- Apply camera shake effects.shake once at cast.\n- Ignores LoS (affects enemies behind cover within the radius)."
  },
  {
    "id": "burning_aura",
    "name": "Burning Aura",
    "short": "Burn",
    "icon": "🔥",
    "type": "aura",
    "cd": 15,
    "mana": 0,
    "radius": 14,
    "tick": 0.7,
    "dmg": 8,
    "duration": 10,
    "manaPerTick": 2,
    "effects": {
      "ring": "0xff8c00",
      "impact": "0xff6347",
      "hand": "0xffa500",
      "shake": 0.1
    },
    "description": "Emit a burning aura that periodically scorches nearby enemies while draining mana.",
    "behavior": "On cast:\n- Start an aura centered on the caster for duration. Aura follows the caster.\n- Every tick seconds:\n - If caster has >= manaPerTick, spend manaPerTick; otherwise end the aura early.\n - Damage all enemies within radius for dmg fire; play effects.impact on each and a subtle effects.ring pulse on caster.\n- Play effects.hand on activation; maintain a faint looping ring visual (effects.ring) for the aura's lifetime.\n- Ignores LoS; ticks cannot crit; no slow applied."
  },
  {
    "id": "meteor_storm",
    "name": "Meteor Storm",
    "short": "Storm",
    "icon": "🌋",
    "type": "storm",
    "cd": 22,
    "mana": 55,
    "radius": 30,
    "strikes": 22,
    "dmg": 20,
    "duration": 7,
    "effects": {
      "impact": "0xff4500",
      "ring": "0xff6347",
      "hand": "0xffa500",
      "shake": 0.45
    },
    "description": "Summon a meteor shower that rains fiery destruction.",
    "behavior": "On cast:\n- Anchor the storm to the caster's current position; the storm area (radius) is stationary for duration.\n- Strike scheduling uses an accumulator at rate = strikes / duration; each time the accumulator >= 1, spawn a strike and decrement by 1. Multiple strikes can occur in a single frame.\n- Each strike:\n - If there are enemies inside radius, pick one at random and impact at their position; otherwise pick a random point uniformly within radius.\n - Deal dmg fire to all enemies within strikeRadius = 2.5 units of impact.\n - Play effects.impact at impact location and apply camera shake effects.shake (scaled down by distance to player).\n- On cast, play effects.hand and a large effects.ring on the ground. Ignores LoS."
  },
  {
    "id": "fire_bolt",
    "name": "Fire Bolt",
    "short": "Bolt+",
    "icon": "🔥",
    "type": "beam",
    "cd": 2.5,
    "mana": 14,
    "range": 36,
    "dmg": 22,
    "effects": {
      "beam": "0xff6347",
      "impact": "0xffa500",
      "hand": "0xff8c00",
      "shake": 0.2
    },
    "description": "Fire a precise, fast flame beam at the first enemy in your aim.",
    "behavior": "On cast:\n- Trace a straight line from caster origin along aim up to range, requiring LoS.\n- Hit the first enemy intersected for dmg fire.\n- Play effects.hand on cast start, effects.beam along the traced line, and effects.impact at the hit location with camera shake effects.shake.\n- If no enemy is hit, still show a brief beam to max range; no damage dealt; cost is consumed (successful cast)."
  },
  {
    "id": "flame_nova",
    "name": "Flame Nova",
    "short": "Nova",
    "icon": "💥",
    "type": "nova",
    "cd": 12,
    "mana": 26,
    "radius": 14,
    "dmg": 30,
    "effects": {
      "ring": "0xff4500",
      "impact": "0xffa500",
      "hand": "0xff6347",
      "shake": 0.35
    },
    "description": "Emit a rapidly expanding fire shockwave from your position.",
    "behavior": "On cast:\n- Spawn a radial wave that expands from 0 to radius over 0.25s (visual only); damage is applied instantly to enemies within radius at cast time.\n- Deal dmg fire to all enemies in radius. Ignores LoS.\n- Play effects.hand on caster, effects.ring expanding, and effects.impact flashes on enemies hit; apply camera shake effects.shake once."
  },
  {
    "id": "blazing_aura",
    "name": "Blazing Aura",
    "short": "Blaze",
    "icon": "🔥",
    "type": "aura",
    "cd": 18,
    "mana": 0,
    "radius": 12,
    "tick": 0.5,
    "dmg": 6,
    "duration": 9,
    "manaPerTick": 2.5,
    "effects": {
      "ring": "0xffd700",
      "impact": "0xffa500",
      "hand": "0xff8c00",
      "shake": 0.18
    },
    "description": "Sustain a blazing field that burns nearby foes more frequently.",
    "behavior": "On cast:\n- Start a following aura for duration; ticks every tick seconds.\n- Each tick: if caster has >= manaPerTick, spend it; else end aura early. Damage all enemies in radius for dmg fire; play effects.impact per enemy; pulse effects.ring on caster.\n- Slightly faster tick than Burning Aura; otherwise identical rules (no LoS needed)."
  },
  {
    "id": "scorching_field",
    "name": "Scorching Field",
    "short": "Scorch",
    "icon": "🔥",
    "type": "aura",
    "cd": 14,
    "mana": 0,
    "radius": 13,
    "tick": 0.6,
    "dmg": 7,
    "duration": 8,
    "manaPerTick": 2,
    "effects": {
      "ring": "0xff6347",
      "impact": "0xff4500",
      "hand": "0xffa500",
      "shake": 0.15
    },
    "description": "Maintain a scorching halo that intermittently burns nearby enemies.",
    "behavior": "On cast:\n- Start a following aura for duration; every tick seconds spend manaPerTick or end early if insufficient.\n- On each tick, damage all enemies within radius for dmg fire and play effects.impact on each; maintain a looping subtle effects.ring around caster."
  },
  {
    "id": "inferno_overload",
    "name": "Inferno Overload",
    "short": "Over",
    "icon": "🔆",
    "type": "aura",
    "cd": 16,
    "mana": 0,
    "radius": 15,
    "tick": 0.55,
    "dmg": 9,
    "duration": 9,
    "manaPerTick": 3,
    "effects": {
      "ring": "0xff4500",
      "impact": "0xff8c00",
      "hand": "0xffa500",
      "shake": 0.2
    },
    "description": "A high-intensity inferno field that hits harder and farther, at higher mana upkeep.",
    "behavior": "On cast:\n- Start a following aura for duration; on each tick spend manaPerTick or end early if insufficient.\n- Each tick deals dmg fire to all enemies within radius; trigger effects.impact on enemies and a brighter effects.ring on caster."
  },
  {
    "id": "fireball",
    "name": "Fireball",
    "short": "Ball",
    "icon": "🔮",
    "type": "beam",
    "cd": 2.2,
    "mana": 16,
    "range": 48,
    "dmg": 20,
    "effects": {
      "beam": "0xff6347",
      "impact": "0xffa500",
      "hand": "0xff8c00",
      "shake": 0.22
    },
    "description": "Launch a concentrated fireball that instantly hits the first enemy in line.",
    "behavior": "On cast:\n- Hitscan along aim up to range (LoS required).\n- First enemy hit takes dmg fire. Play effects.beam along path and effects.impact at hit; effects.hand at cast; apply camera shake effects.shake.\n- If no hit, show a brief beam to max range; cost consumed."
  },
  {
    "id": "flame_spear",
    "name": "Flame Spear",
    "short": "Spear",
    "icon": "🔥",
    "type": "beam",
    "cd": 3.2,
    "mana": 18,
    "range": 52,
    "dmg": 28,
    "effects": {
      "beam": "0xff4500",
      "impact": "0xffa500",
      "hand": "0xff6347",
      "shake": 0.28
    },
    "description": "A high-temperature spear of fire that pierces armor and strikes a single target.",
    "behavior": "On cast:\n- Hitscan along aim up to range (LoS). Impact the first enemy hit for dmg fire.\n- Visuals: effects.hand on cast, a thin long effects.beam, and effects.impact at hit with camera shake effects.shake.\n- Treats target shields like normal health unless your game has special interactions (no innate shield-bypass logic)."
  },
  {
    "id": "heatwave",
    "name": "Heatwave",
    "short": "Heat",
    "icon": "🔥",
    "type": "beam",
    "cd": 2.8,
    "mana": 15,
    "range": 40,
    "dmg": 24,
    "effects": {
      "beam": "0xff8c00",
      "impact": "0xffa500",
      "hand": "0xff6347",
      "shake": 0.3
    },
    "description": "Project a short, forceful wave of heat in a line.",
    "behavior": "On cast:\n- Hitscan along aim up to range; first enemy hit takes dmg fire.\n- Visuals: thicker, shorter-duration effects.beam and effects.impact at hit; play effects.hand and camera shake effects.shake.\n- No knockback or slow by default."
  },
  {
    "id": "volcanic_wrath",
    "name": "Volcanic Wrath",
    "short": "Wrath",
    "icon": "🌋",
    "type": "storm",
    "cd": 18,
    "mana": 42,
    "radius": 24,
    "strikes": 14,
    "dmg": 18,
    "duration": 5.5,
    "effects": {
      "impact": "0xff4500",
      "ring": "0xff6347",
      "hand": "0xffa500",
      "shake": 0.35
    },
    "description": "A brief, intense volcanic eruption focused over a smaller area.",
    "behavior": "On cast:\n- Stationary storm centered at cast position for duration.\n- Strike rate = strikes / duration via accumulator. Each strike selects a random enemy inside radius (or random point if none).\n- Each strike deals dmg to enemies within strikeRadius = 2.5 units; play effects.impact and shake = effects.shake (distance-attenuated).\n- effects.hand on cast; red-hued effects.ring marking the area. Ignores LoS."
  },
  {
    "id": "fire_dome",
    "name": "Fire Dome",
    "short": "Dome",
    "icon": "🌋",
    "type": "storm",
    "cd": 24,
    "mana": 60,
    "radius": 32,
    "strikes": 28,
    "dmg": 18,
    "duration": 8,
    "effects": {
      "impact": "0xff6347",
      "ring": "0xff4500",
      "hand": "0xffa500",
      "shake": 0.6
    },
    "description": "A large dome of relentless fire strikes over an extended period.",
    "behavior": "On cast:\n- Stationary storm, large radius, duration as specified.\n- Strike scheduling with accumulator at rate = strikes / duration. Prefer randomly selecting from current enemies in radius; fallback to random ground points.\n- Each strike deals dmg to enemies within strikeRadius = 3.0 units; play effects.impact per strike and strong shake effects.shake (distance-attenuated).\n- Draw a prominent boundary using effects.ring on cast; ignores LoS."
  },
  {
    "id": "lava_storm",
    "name": "Lava Storm",
    "short": "Lava",
    "icon": "🌋",
    "type": "storm",
    "cd": 20,
    "mana": 50,
    "radius": 28,
    "strikes": 20,
    "dmg": 19,
    "duration": 6.5,
    "effects": {
      "impact": "0xff4500",
      "ring": "0xff6347",
      "hand": "0xffa500",
      "shake": 0.38
    },
    "description": "A balanced storm of molten lava strikes.",
    "behavior": "On cast:\n- Stationary storm at cast position for duration.\n- Spawn strikes using accumulator at rate = strikes / duration; each strike targets a random enemy in radius or a random point.\n- Impact deals dmg to enemies within strikeRadius = 2.5 units; play effects.impact and shake with intensity effects.shake.\n- On cast, show effects.ring and effects.hand. Ignores LoS."
  },
  {
    "id": "flame_ring",
    "name": "Flame Ring",
    "short": "Ring",
    "icon": "💥",
    "type": "aoe",
    "cd": 10,
    "mana": 32,
    "radius": 18,
    "dmg": 32,
    "slowFactor": 0.4,
    "slowDuration": 1.2,
    "effects": {
      "ring": "0xff6347",
      "impact": "0xffa500",
      "hand": "0xff8c00",
      "shake": 0.32
    },
    "description": "A powerful circular blast of flames that damages and burns around you.",
    "behavior": "On cast:\n- Instant AoE centered on caster with radius.\n- Deal dmg fire to all enemies in radius; apply slow (slowFactor, slowDuration).\n- Play effects.hand on caster, effects.ring expanding, and effects.impact on each enemy hit; camera shake effects.shake once.\n- Ignores LoS."
  },
  {
    "id": "ember_burst",
    "name": "Ember Burst",
    "short": "Ember",
    "icon": "💥",
    "type": "aoe",
    "cd": 7,
    "mana": 28,
    "radius": 15,
    "dmg": 28,
    "effects": {
      "ring": "0xffa500",
      "impact": "0xff8c00",
      "hand": "0xff6347",
      "shake": 0.28
    },
    "description": "Release a quick burst of embers around you.",
    "behavior": "On cast:\n- Instant AoE centered on caster with radius.\n- Deal dmg fire to all enemies in radius.\n- Play effects.hand, effects.ring expanding, and effects.impact on enemies; camera shake effects.shake.\n- Ignores LoS."
  },
  {
    "id": "pyroclasm",
    "name": "Pyroclasm",
    "short": "Pyro",
    "icon": "🌋",
    "type": "aoe",
    "cd": 11,
    "mana": 36,
    "radius": 20,
    "dmg": 38,
    "slowFactor": 0.5,
    "slowDuration": 1.8,
    "effects": {
      "ring": "0xff4500",
      "impact": "0xffa500",
      "hand": "0xff6347",
      "shake": 0.4
    },
    "description": "Trigger a massive pyroclastic explosion around you.",
    "behavior": "On cast:\n- Instant AoE centered on caster with radius.\n- Deal dmg fire to all enemies in radius; apply slow (slowFactor, slowDuration).\n- Play effects.hand, effects.ring expanding, and effects.impact on enemies; strong camera shake effects.shake.\n- Ignores LoS."
  }
];

export const SKILL_COLOR_TOKENS = Object.freeze({
  // extra shared color tokens used outside the skills system
  portal: 0xff1493,
  village: 0xffb347,
  lava: 0xff4500,
  ember: 0xffa500,
  ash: 0x696969,
  volcano: 0x8b4513,
});

/**
 * Default starting loadout (4 skill IDs)
 */
export const DEFAULT_LOADOUT = Object.freeze(
  SKILL_POOL.slice(0, 4).map((skill) => skill.id)
);
