/**
 * Skill documentation moved out of skills_pool.js to keep the pool lean.
 * Each entry contains human-readable description and behavior for the skill.
 */
export const SKILL_DOCS = Object.freeze({
  flame_chain: {
    description: "Ignite an enemy and spread flames to nearby foes, burning each struck target.",
    behavior: "On cast:\n- Validate an initial enemy target within range and LoS from the caster's aim reticle; if none, fail (no cost).\n- Play effects.hand on caster.\n- Hit the initial target for dmg fire, apply slow (slowFactor, slowDuration). Play effects.impact at target and camera shake with effects.shake.\n- Draw a flame beam from caster to target using effects.beam.\n- Chain logic:\n - Maintain a set of already-hit targets (start with the initial target).\n - For up to jumps additional hits:\n - Find the nearest enemy to the last hit target within jumpRange and LoS that is not yet hit and is alive.\n - If none found, stop chaining.\n - Travel time is instantaneous; draw effects.arc between the last target and the new target and play effects.impact on hit.\n - Apply dmg and the same slow to the new target; add to hit set.\n- No damage falloff between jumps by default.\n- Apply no friendly fire; ignores dead/untargetable units."
  },
  inferno_blast: {
    description: "Unleash a fiery explosion around you, damaging and heavily burning enemies.",
    behavior: "On cast:\n- Centered on the caster, create an immediate AoE with radius.\n- Play effects.hand on caster and effects.ring expanding from caster; flash effects.impact on each enemy hit.\n- All enemies within radius take dmg fire and are slowed by slowFactor for slowDuration.\n- Apply camera shake effects.shake once at cast.\n- Ignores LoS (affects enemies behind cover within the radius)."
  },
  burning_aura: {
    description: "Emit a burning aura that periodically scorches nearby enemies while draining mana.",
    behavior: "On cast:\n- Start an aura centered on the caster for duration. Aura follows the caster.\n- Every tick seconds:\n - If caster has >= manaPerTick, spend manaPerTick; otherwise end the aura early.\n - Damage all enemies within radius for dmg fire; play effects.impact on each and a subtle effects.ring pulse on caster.\n- Play effects.hand on activation; maintain a faint looping ring visual (effects.ring) for the aura's lifetime.\n- Ignores LoS; ticks cannot crit; no slow applied."
  },
  meteor_storm: {
    description: "Summon a meteor shower that rains fiery destruction.",
    behavior: "On cast:\n- Anchor the storm to the caster's current position; the storm area (radius) is stationary for duration.\n- Strike scheduling uses an accumulator at rate = strikes / duration; each time the accumulator >= 1, spawn a strike and decrement by 1. Multiple strikes can occur in a single frame.\n- Each strike:\n - If there are enemies inside radius, pick one at random and impact at their position; otherwise pick a random point uniformly within radius.\n - Deal dmg fire to all enemies within strikeRadius = 2.5 units of impact.\n - Play effects.impact at impact location and apply camera shake effects.shake (scaled down by distance to player).\n- On cast, play effects.hand and a large effects.ring on the ground. Ignores LoS."
  },
  fire_bolt: {
    description: "Fire a precise, fast flame beam at the first enemy in your aim.",
    behavior: "On cast:\n- Trace a straight line from caster origin along aim up to range, requiring LoS.\n- Hit the first enemy intersected for dmg fire.\n- Play effects.hand on cast start, effects.beam along the traced line, and effects.impact at the hit location with camera shake effects.shake.\n- If no enemy is hit, still show a brief beam to max range; no damage dealt; cost is consumed (successful cast)."
  },
  flame_nova: {
    description: "Emit a rapidly expanding fire shockwave from your position.",
    behavior: "On cast:\n- Spawn a radial wave that expands from 0 to radius over 0.25s (visual only); damage is applied instantly to enemies within radius at cast time.\n- Deal dmg fire to all enemies in radius. Ignores LoS.\n- Play effects.hand on caster, effects.ring expanding, and effects.impact flashes on enemies hit; apply camera shake effects.shake once."
  },
  blazing_aura: {
    description: "Sustain a blazing field that burns nearby foes more frequently.",
    behavior: "On cast:\n- Start a following aura for duration; ticks every tick seconds.\n- Each tick: if caster has >= manaPerTick, spend it; else end aura early. Damage all enemies in radius for dmg fire; play effects.impact per enemy; pulse effects.ring on caster.\n- Slightly faster tick than Burning Aura; otherwise identical rules (no LoS needed)."
  },
  scorching_field: {
    description: "Maintain a scorching halo that intermittently burns nearby enemies.",
    behavior: "On cast:\n- Start a following aura for duration; every tick seconds spend manaPerTick or end early if insufficient.\n- On each tick, damage all enemies within radius for dmg fire and play effects.impact on each; maintain a looping subtle effects.ring around caster."
  },
  inferno_overload: {
    description: "A high-intensity inferno field that hits harder and farther, at higher mana upkeep.",
    behavior: "On cast:\n- Start a following aura for duration; on each tick spend manaPerTick or end early if insufficient.\n- Each tick deals dmg fire to all enemies within radius; trigger effects.impact on enemies and a brighter effects.ring on caster."
  },
  fireball: {
    description: "Launch a concentrated fireball that instantly hits the first enemy in line.",
    behavior: "On cast:\n- Hitscan along aim up to range (LoS required).\n- First enemy hit takes dmg fire. Play effects.beam along path and effects.impact at hit; effects.hand at cast; apply camera shake effects.shake.\n- If no hit, show a brief beam to max range; cost consumed."
  },
  flame_spear: {
    description: "A high-temperature spear of fire that pierces armor and strikes a single target.",
    behavior: "On cast:\n- Hitscan along aim up to range (LoS). Impact the first enemy hit for dmg fire.\n- Visuals: effects.hand on cast, a thin long effects.beam, and effects.impact at hit with camera shake effects.shake.\n- Treats target shields like normal health unless your game has special interactions (no innate shield-bypass logic)."
  },
  heatwave: {
    description: "Project a short, forceful wave of heat in a line.",
    behavior: "On cast:\n- Hitscan along aim up to range; first enemy hit takes dmg fire.\n- Visuals: thicker, shorter-duration effects.beam and effects.impact at hit; play effects.hand and camera shake effects.shake.\n- No knockback or slow by default."
  },
  volcanic_wrath: {
    description: "A brief, intense volcanic eruption focused over a smaller area.",
    behavior: "On cast:\n- Stationary storm centered at cast position for duration.\n- Strike rate = strikes / duration via accumulator. Each strike selects a random enemy inside radius (or random point if none).\n- Each strike deals dmg to enemies within strikeRadius = 2.5 units; play effects.impact and shake = effects.shake (distance-attenuated).\n- effects.hand on cast; red-hued effects.ring marking the area. Ignores LoS."
  },
  fire_dome: {
    description: "A large dome of relentless fire strikes over an extended period.",
    behavior: "On cast:\n- Stationary storm, large radius, duration as specified.\n- Strike scheduling with accumulator at rate = strikes / duration. Prefer randomly selecting from current enemies in radius; fallback to random ground points.\n- Each strike deals dmg to enemies within strikeRadius = 3.0 units; play effects.impact per strike and strong shake effects.shake (distance-attenuated).\n- Draw a prominent boundary using effects.ring on cast; ignores LoS."
  },
  lava_storm: {
    description: "A balanced storm of molten lava strikes.",
    behavior: "On cast:\n- Stationary storm at cast position for duration.\n- Spawn strikes using accumulator at rate = strikes / duration; each strike targets a random enemy in radius or a random point.\n- Impact deals dmg to enemies within strikeRadius = 2.5 units; play effects.impact and shake with intensity effects.shake.\n- On cast, show effects.ring and effects.hand. Ignores LoS."
  },
  flame_ring: {
    description: "A powerful circular blast of flames that damages and burns around you.",
    behavior: "On cast:\n- Instant AoE centered on caster with radius.\n- Deal dmg fire to all enemies in radius; apply slow (slowFactor, slowDuration).\n- Play effects.hand on caster, effects.ring expanding, and effects.impact on each enemy hit; camera shake effects.shake once.\n- Ignores LoS."
  },
  ember_burst: {
    description: "Release a quick burst of embers around you.",
    behavior: "On cast:\n- Instant AoE centered on caster with radius.\n- Deal dmg fire to all enemies in radius.\n- Play effects.hand, effects.ring expanding, and effects.impact on enemies; camera shake effects.shake.\n- Ignores LoS."
  },
  pyroclasm: {
    description: "Trigger a massive pyroclastic explosion around you.",
    behavior: "On cast:\n- Instant AoE centered on caster with radius.\n- Deal dmg fire to all enemies in radius; apply slow (slowFactor, slowDuration).\n- Play effects.hand, effects.ring expanding, and effects.impact on enemies; strong camera shake effects.shake.\n- Ignores LoS."
  }
});
