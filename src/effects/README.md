# Effects Directory

This directory contains individual effect implementations for each skill.

## How It Works

1. **File Naming**: Each effect file is named after the skill ID (e.g., `flame_chain.js` for the `flame_chain` skill)
2. **Auto-Loading**: The `effects_loader.js` automatically discovers and loads all effect files
3. **No Registration Needed**: Just drop a new file here and it's automatically available
4. **Graceful Fallback**: If a skill doesn't have a custom effect, a default is used

## Creating a New Effect

### 1. Create the file

Create a new file named `{skill_id}.js` in this directory.

### 2. Export the effect function

```javascript
import { SKILL_FX } from "../skills_fx.js";

/**
 * My Skill Effect
 * Description of what the effect does
 */
export default function mySkillEffect(baseEffects, params) {
  const { from, to, center, radius } = params;
  const fx = SKILL_FX.my_skill || {};
  const colors = {
    beam: fx.beam || "#ff6347",
    impact: fx.impact || "#ffa500",
    ring: fx.ring || "#ff8c00"
  };
  
  // Use base effects to compose your visual
  baseEffects.spawnBeam(from, to, colors.beam, 0.15);
  baseEffects.spawnImpact(to, 2.0, colors.impact);
}
```

### 3. That's it!

The effect is automatically loaded and available. No need to modify any other files.

## Effect Function Signature

```javascript
function effectFunction(baseEffects, params)
```

### Parameters

- **baseEffects**: Instance of `BaseEffects` with all primitive methods
  - `spawnBeam(from, to, color, life)`
  - `spawnArc(from, to, color, life, segments, amplitude)`
  - `spawnImpact(point, radius, color, intensity)`
  - `spawnRing(center, radius, color, duration, width, opacity)`
  - `spawnSphere(position, radius, color, life, opacity)`
  - `spawnProjectile(from, to, opts)`
  - `spawnCage(center, radius, color, duration, bars, height)`
  - `spawnShield(entity, color, duration, radius)`
  - `spawnOrbitingOrbs(entity, color, opts)`

- **params**: Object containing effect parameters
  - `skillId`: The skill identifier
  - `player`: The casting entity
  - `from`: Source position (Vector3)
  - `to`: Target position (Vector3)
  - `center`: Center position for AoE (Vector3)
  - `radius`: Effect radius
  - `targets`: Array of affected entities
  - `chain`: Array of positions for chain effects
  - `tick`: Boolean for periodic aura effects
  - `strike`: Boolean for storm strike effects
  - `strikePos`: Position of individual strike
  - Any other skill-specific data

## Common Patterns

### Chain Effect
```javascript
if (chain && chain.length > 0) {
  for (let i = 0; i < chain.length - 1; i++) {
    baseEffects.spawnArc(chain[i], chain[i + 1], color, 0.15, 8, 0.4);
    baseEffects.spawnImpact(chain[i + 1], 1.2, color, 0.8);
  }
}
```

### AOE Blast
```javascript
baseEffects.spawnRing(center, radius, colors.ring, 0.5, 1.0, 0.7);
baseEffects.spawnImpact(center, radius * 0.5, colors.impact, 1.5);

// Radial beams
for (let i = 0; i < 12; i++) {
  const ang = (i / 12) * Math.PI * 2;
  const target = new THREE.Vector3(
    center.x + Math.cos(ang) * radius,
    center.y,
    center.z + Math.sin(ang) * radius
  );
  baseEffects.spawnBeam(center, target, colors.beam, 0.2);
}
```

### Projectile
```javascript
baseEffects.spawnProjectile(from, to, {
  color: colors.beam,
  size: 0.4,
  speed: 25,
  trail: true,
  onComplete: (hitPos) => {
    baseEffects.spawnImpact(hitPos, 2.0, colors.impact);
  }
});
```

### Aura (Periodic)
```javascript
if (tick) {
  // Periodic pulse
  baseEffects.spawnRing(center, radius, colors.ring, 0.3, 0.4, 0.4);
} else {
  // Initial activation
  baseEffects.spawnRing(center, radius, colors.ring, 0.6, 0.6, 0.6);
  baseEffects.spawnOrbitingOrbs(player, colors.hand, {
    count: 6,
    radius: radius * 0.7,
    duration: 0.8
  });
}
```

## Quality Scaling

Effects automatically adapt to quality settings. You can check quality in your effect:

```javascript
const particleCount = baseEffects.quality === "low" ? 5 : 
                     baseEffects.quality === "medium" ? 10 : 15;
```

## Color Configuration

Colors are defined in `skills_fx.js`. Always pull colors from there:

```javascript
const fx = SKILL_FX.my_skill || {};
const colors = {
  beam: fx.beam || "#ff6347",    // Fallback to default
  arc: fx.arc || "#ff4500",
  impact: fx.impact || "#ffa500",
  ring: fx.ring || "#ff8c00"
};
```

## Debugging

If your effect isn't loading:

1. Check the browser console for errors
2. Verify the filename matches the skill ID exactly
3. Ensure you're exporting a default function
4. Check that the function signature is correct

## Examples

See existing effect files in this directory:
- `flame_chain.js` - Chain effect
- `inferno_blast.js` - AOE blast
- `fireball.js` - Projectile
- `burning_aura.js` - Periodic aura
- `flame_nova.js` - Nova/shockwave

## Performance Tips

1. Use quality scaling for particle counts
2. Keep lifetimes short (0.1-0.5 seconds)
3. Reuse temp vectors when possible
4. Avoid creating effects every frame
5. Use setTimeout for delayed effects sparingly