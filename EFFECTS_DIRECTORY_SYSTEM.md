# Effects Directory System

## Overview

The effects system has been refactored to use a **directory-based architecture** where each skill effect is a separate file. This makes the system highly scalable and maintainable.

## Architecture

```
src/
├── effects/                    # Individual effect files
│   ├── flame_chain.js         # One file per skill
│   ├── fireball.js
│   ├── inferno_blast.js
│   └── ...                    # 18 total effect files
├── effects_loader.js          # Dynamic loader (auto-discovers effects)
├── effects_base.js            # Base effect primitives
├── effects.js                 # Main effects manager
└── effects_registry.js        # OLD - can be removed
```

## How It Works

### 1. **Auto-Discovery**
The `effects_loader.js` automatically discovers and loads all effect files from the `src/effects/` directory based on skill IDs in `SKILLS_POOL`.

```javascript
// effects_loader.js automatically does this:
for (const skillId of SKILLS_POOL) {
  try {
    const module = await import(`./effects/${skillId}.js`);
    effectsRegistry[skillId] = module.default;
  } catch {
    // No effect file - will use default
  }
}
```

### 2. **No Registration Needed**
Just create a file named `{skill_id}.js` in `src/effects/` and it's automatically loaded. No need to modify any other files.

### 3. **Graceful Fallback**
If a skill doesn't have a custom effect file, a default effect is used automatically with a console warning.

## Adding a New Effect

### Step 1: Create the file

Create `src/effects/{skill_id}.js`:

```javascript
import { SKILL_FX } from "../skills_fx.js";

/**
 * My New Skill Effect
 * Description of what it does
 */
export default function myNewSkillEffect(baseEffects, params) {
  const { from, to, center, radius } = params;
  const fx = SKILL_FX.my_new_skill || {};
  const colors = {
    beam: fx.beam || "#ff6347",
    impact: fx.impact || "#ffa500"
  };
  
  // Use base effects to compose your visual
  baseEffects.spawnBeam(from, to, colors.beam, 0.15);
  baseEffects.spawnImpact(to, 2.0, colors.impact);
}
```

### Step 2: That's it!

The effect is automatically loaded and available. No other files need to be modified.

## Updating an Effect

Simply edit the effect file in `src/effects/`. Changes take effect on page reload.

## Removing an Effect

Delete the file from `src/effects/`. The system will automatically fall back to the default effect.

## Benefits

### ✅ **Scalability**
- No single large file to manage
- Easy to find and edit specific effects
- No merge conflicts when multiple developers work on different effects

### ✅ **Maintainability**
- Each effect is self-contained
- Clear file structure
- Easy to understand and debug

### ✅ **Flexibility**
- Drop-in new effects without touching core code
- Easy to A/B test different effect implementations
- Can version control individual effects

### ✅ **Developer Experience**
- No need to understand the entire effects system
- Just follow the pattern in existing files
- Comprehensive README in effects/ directory

## File Structure

### Effect File Template

```javascript
import * as THREE from "../../vendor/three/build/three.module.js"; // If needed
import { SKILL_FX } from "../skills_fx.js";

// Temp vectors if needed
const __vA = new THREE.Vector3();
const __vB = new THREE.Vector3();

/**
 * Skill Name Effect
 * Description
 */
export default function skillIdEffect(baseEffects, params) {
  // Extract parameters
  const { from, to, center, radius, targets, player } = params;
  
  // Get colors from skills_fx.js
  const fx = SKILL_FX.skill_id || {};
  const colors = {
    beam: fx.beam || "#ff6347",
    arc: fx.arc || "#ff4500",
    impact: fx.impact || "#ffa500",
    ring: fx.ring || "#ff8c00"
  };
  
  // Compose effect using base primitives
  baseEffects.spawnBeam(from, to, colors.beam, 0.15);
  baseEffects.spawnImpact(to, 2.0, colors.impact);
}
```

## Available Base Effects

All effect files have access to these base primitives via `baseEffects`:

- `spawnBeam(from, to, color, life)` - Straight line
- `spawnArc(from, to, color, life, segments, amplitude)` - Wavy line
- `spawnImpact(point, radius, color, intensity)` - Explosion
- `spawnRing(center, radius, color, duration, width, opacity)` - Ground ring
- `spawnSphere(position, radius, color, life, opacity)` - Sphere flash
- `spawnProjectile(from, to, opts)` - Traveling projectile
- `spawnCage(center, radius, color, duration, bars, height)` - Vertical bars
- `spawnShield(entity, color, duration, radius)` - Shield bubble
- `spawnOrbitingOrbs(entity, color, opts)` - Orbiting particles

## Effect Parameters

Each effect function receives:

```javascript
{
  skillId: string,        // The skill identifier
  player: Entity,         // The casting entity
  from: Vector3,          // Source position
  to: Vector3,            // Target position
  center: Vector3,        // Center for AoE
  radius: number,         // Effect radius
  targets: Array,         // Affected entities
  chain: Array<Vector3>,  // Chain positions
  tick: boolean,          // Periodic aura tick
  strike: boolean,        // Storm strike
  strikePos: Vector3,     // Strike position
  // ... any other skill-specific data
}
```

## Quality Scaling

Effects automatically adapt to quality settings:

```javascript
const particleCount = baseEffects.quality === "low" ? 5 : 
                     baseEffects.quality === "medium" ? 10 : 15;
```

## Examples

### Chain Effect
See: `src/effects/flame_chain.js`

### AOE Blast
See: `src/effects/inferno_blast.js`

### Projectile
See: `src/effects/fireball.js`

### Aura (Periodic)
See: `src/effects/burning_aura.js`

### Storm
See: `src/effects/meteor_storm.js`

### Nova/Ring
See: `src/effects/flame_nova.js`

## Migration from Old System

The old `effects_registry.js` is no longer used. All effects have been migrated to individual files in `src/effects/`.

### Old Way (effects_registry.js)
```javascript
const SKILL_EFFECTS = {
  flame_chain: (baseEffects, params) => { ... },
  fireball: (baseEffects, params) => { ... },
  // ... 18 effects in one file
};
```

### New Way (src/effects/)
```
src/effects/
├── flame_chain.js
├── fireball.js
└── ...
```

## Debugging

### Check if effect loaded
```javascript
console.log('[EffectsLoader] Loaded effect: flame_chain');
```

### Check for missing effects
```javascript
console.warn('[EffectsLoader] No custom effect for skill "my_skill", using default');
```

### Force reload effects (development)
```javascript
import { reloadEffects } from './effects_loader.js';
await reloadEffects();
```

## Performance

- Effects are loaded once on first use (lazy loading)
- Dynamic imports are cached by the browser
- No performance impact compared to the old registry system
- Can preload effects during game initialization:

```javascript
import { preloadEffects } from './effects_loader.js';
await preloadEffects();
```

## Future Enhancements

### Plugin System
The directory-based system makes it easy to add a plugin system:

```javascript
// Load custom effects from plugins
await import(`./plugins/my_plugin/effects/custom_skill.js`);
```

### Hot Reload (Development)
Could add hot module replacement for live effect editing:

```javascript
if (import.meta.hot) {
  import.meta.hot.accept('./effects/flame_chain.js', (newModule) => {
    registerSkillEffect('flame_chain', newModule.default);
  });
}
```

### Effect Variants
Easy to create variants by duplicating and modifying files:

```
src/effects/
├── fireball.js           # Default
├── fireball_ice.js       # Ice variant
└── fireball_lightning.js # Lightning variant
```

## Summary

The directory-based effects system provides:

✅ **Scalability** - Easy to add new effects  
✅ **Maintainability** - Each effect is self-contained  
✅ **Flexibility** - Drop-in updates without touching core code  
✅ **Developer Experience** - Simple, clear patterns to follow  
✅ **Zero Breaking Changes** - Fully backward compatible  

Just drop a file in `src/effects/` and it works! 🎉