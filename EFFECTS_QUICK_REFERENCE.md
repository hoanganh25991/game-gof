# Effects System - Quick Reference

## For Developers: How to Use the New Effects System

### Quick Start

#### Execute a Skill Effect
```javascript
// In skills.js or any skill implementation
this.effects.executeSkillEffect('flame_chain', {
  player: this.player,
  from: handWorldPos(this.player),
  to: targetPosition,
  chain: [pos1, pos2, pos3],
  targets: [enemy1, enemy2, enemy3]
});
```

#### Use Base Effects Directly
```javascript
// Simple beam
this.effects.spawnBeam(from, to, COLOR.fire, 0.15);

// Wavy arc
this.effects.spawnArc(from, to, COLOR.fire, 0.15, 10, 0.5);

// Explosion
this.effects.spawnImpact(position, radius, COLOR.fire, intensity);

// Ground ring
this.effects.spawnRing(center, radius, COLOR.fire, duration);

// Projectile
this.effects.spawnProjectile(from, to, {
  color: COLOR.fire,
  size: 0.4,
  speed: 25,
  trail: true,
  onComplete: (hitPos) => {
    this.effects.spawnImpact(hitPos, 2.0, COLOR.fire);
  }
});
```

## Base Effects API

### Beams & Lines

#### `spawnBeam(from, to, color, life)`
Simple straight line between two points.
```javascript
this.effects.spawnBeam(
  new THREE.Vector3(0, 1, 0),  // from
  new THREE.Vector3(5, 1, 0),  // to
  COLOR.fire,                   // color
  0.15                          // lifetime in seconds
);
```

#### `spawnArc(from, to, color, life, segments, amplitude)`
Wavy line with turbulence (for lightning, chains, etc.).
```javascript
this.effects.spawnArc(
  from,
  to,
  COLOR.fire,
  0.15,      // lifetime
  10,        // segments (more = smoother)
  0.5        // amplitude (wave size)
);
```

### Impacts & Explosions

#### `spawnImpact(point, radius, color, intensity)`
Explosion with vertical pillars and radial bursts.
```javascript
this.effects.spawnImpact(
  position,
  2.0,        // radius
  COLOR.fire,
  1.5         // intensity (affects particle count)
);
```

### Rings & Areas

#### `spawnRing(center, radius, color, duration, width, opacity)`
Expanding ground ring (for AoE indicators).
```javascript
this.effects.spawnRing(
  center,
  6.0,        // radius
  COLOR.fire,
  0.35,       // duration
  0.6,        // width
  0.55        // opacity
);
```

### Spheres & Flashes

#### `spawnSphere(position, radius, color, life, opacity)`
Sphere for flashes, explosions, orbs.
```javascript
this.effects.spawnSphere(
  position,
  0.3,        // radius
  COLOR.fire,
  0.12,       // lifetime
  0.9         // opacity
);
```

### Projectiles

#### `spawnProjectile(from, to, opts)`
Traveling projectile with trail and callback.
```javascript
this.effects.spawnProjectile(from, to, {
  color: COLOR.fire,
  size: 0.4,
  speed: 25,
  trail: true,  // spawn trail particles
  onComplete: (hitPos) => {
    // Called when projectile reaches target
    this.effects.spawnImpact(hitPos, 2.0, COLOR.fire);
  }
});
```

### Special Effects

#### `spawnCage(center, radius, color, duration, bars, height)`
Vertical bar cage (for prisons, shields).
```javascript
this.effects.spawnCage(
  center,
  12,         // radius
  COLOR.fire,
  0.6,        // duration
  12,         // number of bars
  2.2         // height
);
```

#### `spawnShield(entity, color, duration, radius)`
Shield bubble that follows entity.
```javascript
this.effects.spawnShield(
  player,
  COLOR.fire,
  6.0,        // duration
  1.7         // radius
);
```

#### `spawnOrbitingOrbs(entity, color, opts)`
Orbiting particles around entity.
```javascript
this.effects.spawnOrbitingOrbs(player, COLOR.fire, {
  count: 4,
  radius: 1.2,
  duration: 1.0,
  size: 0.16,
  rate: 4.0
});
```

## Skill Effect Registry

### Check if Skill Has Effect
```javascript
if (this.effects.hasSkillEffect('flame_chain')) {
  // Skill has custom effect
}
```

### Execute Skill Effect
```javascript
this.effects.executeSkillEffect(skillId, {
  // Common params
  player: this.player,
  from: sourcePosition,
  to: targetPosition,
  center: aoeCenter,
  radius: aoeRadius,
  
  // Skill-specific params
  chain: [pos1, pos2, pos3],      // For chain skills
  targets: [enemy1, enemy2],       // Affected enemies
  strike: true,                    // For storm skills
  strikePos: meteorPosition,       // Individual strike position
  tick: true,                      // For aura skills (periodic)
  
  // Any other data your effect needs
});
```

## Skill Effect Parameters by Type

### Chain Skills
```javascript
{
  from: handWorldPos(player),
  chain: [pos1, pos2, pos3],  // Array of positions
  targets: [enemy1, enemy2]    // Array of hit enemies
}
```

### AOE Blast Skills
```javascript
{
  center: blastCenter,
  radius: blastRadius,
  targets: affectedEnemies
}
```

### Aura Skills
```javascript
// On activation
{
  center: player.pos(),
  radius: auraRadius,
  player: player
}

// On each tick
{
  center: player.pos(),
  radius: auraRadius,
  player: player,
  tick: true,
  targets: affectedEnemies
}
```

### Storm Skills
```javascript
// On activation
{
  center: stormCenter,
  radius: stormRadius
}

// On each strike
{
  center: stormCenter,
  radius: stormRadius,
  strike: true,
  strikePos: meteorPosition
}
```

### Projectile/Beam Skills
```javascript
{
  from: handWorldPos(player),
  to: targetPosition
}
```

### Nova/Ring Skills
```javascript
{
  center: player.pos(),
  radius: novaRadius,
  targets: affectedEnemies
}
```

## Adding a New Skill Effect

### 1. Add Color Config (`skills_fx.js`)
```javascript
export const SKILL_FX = Object.freeze({
  // ... existing skills ...
  
  my_new_skill: {
    beam: "#ff6347",    // Beam/projectile color
    arc: "#ff4500",     // Arc/chain color
    impact: "#ffa500",  // Impact/explosion color
    ring: "#ff8c00",    // Ring/AoE indicator color
    hand: "#ff6347",    // Hand flash color
    shake: 0.25         // Camera shake intensity (0-1)
  }
});
```

### 2. Register Effect (`effects_registry.js`)
```javascript
const SKILL_EFFECTS = {
  // ... existing effects ...
  
  my_new_skill: (baseEffects, params) => {
    const { from, to, center, radius } = params;
    const colors = getSkillColors('my_new_skill');
    
    // Compose your effect using base primitives
    baseEffects.spawnProjectile(from, to, {
      color: colors.beam,
      size: 0.5,
      speed: 25,
      onComplete: (hitPos) => {
        baseEffects.spawnImpact(hitPos, 2.0, colors.impact, 1.5);
        baseEffects.spawnRing(hitPos, 3.0, colors.ring, 0.4);
      }
    });
  }
};
```

### 3. Use in Skill Code (`skills.js`)
```javascript
_castMyNewSkill(key) {
  const SK = getSkill(key);
  // ... validation, targeting, damage logic ...
  
  // Execute visual effect
  this.effects.executeSkillEffect(SK.id, {
    from: handWorldPos(this.player),
    to: targetPosition,
    center: impactCenter,
    radius: 5.0
  });
  
  // Camera shake
  const fx = this._fx(SK);
  this._requestShake(fx.shake || 0);
}
```

## Legacy Methods (Still Supported)

These methods are preserved for backward compatibility:

```javascript
// Still works
this.effects.spawnFireball(from, to, opts);
this.effects.spawnFireStream(from, to, color, life);
this.effects.spawnFireStreamAuto(from, to, color, life);
this.effects.spawnArcNoisePath(from, to, color, life, passes);
this.effects.spawnStrike(point, radius, color);
this.effects.spawnHitDecal(center, color);
this.effects.spawnRingPulse(center, radius, color, duration);
this.effects.spawnShieldBubble(entity, color, duration, radius);
this.effects.spawnStormCloud(center, radius, color, duration, height);
```

But prefer using base effects or registry for new code.

## Color Constants

```javascript
import { COLOR } from "./constants.js";

COLOR.fire        // Primary fire orange
COLOR.darkFire    // Deep dark orange
COLOR.midFire     // Lighter orange
COLOR.accent      // Theme accent
COLOR.yellow      // Bright yellow
COLOR.ember       // Ember orange
COLOR.white       // Warm white
COLOR.hp          // HP red
COLOR.mp          // MP blue
COLOR.xp          // XP gold
```

## Quality Settings

Effects automatically adapt to quality settings:
- `low` - Fewer particles, shorter lifetimes
- `medium` - Balanced
- `high` - Full quality

Access quality in custom effects:
```javascript
const particleCount = baseEffects.quality === "low" ? 5 : 
                     baseEffects.quality === "medium" ? 10 : 15;
```

## Performance Tips

1. **Reuse temp vectors** - BaseEffects provides `_tmpVecA` through `_tmpVecE`
2. **Batch effects** - Collect data, then call effect once
3. **Quality scaling** - Reduce particle count on low quality
4. **Lifetime management** - Shorter lifetimes = better performance
5. **Avoid per-frame effects** - Use queued animations instead

## Debugging

### Check if effect executed
```javascript
console.log('Executing effect:', skillId);
this.effects.executeSkillEffect(skillId, params);
```

### Check if skill has custom effect
```javascript
if (!this.effects.hasSkillEffect(skillId)) {
  console.warn('No custom effect for:', skillId);
}
```

### Monitor effect queue
```javascript
console.log('Active effects:', this.effects.queue.length);
```

## Common Patterns

### Chain Effect
```javascript
const positions = [start];
for (let target of targets) {
  positions.push(target.pos());
}

this.effects.executeSkillEffect('my_chain', {
  chain: positions,
  targets: targets
});
```

### Delayed Effect
```javascript
setTimeout(() => {
  this.effects.spawnImpact(position, 2.0, COLOR.fire);
}, 500);
```

### Repeated Effect
```javascript
for (let i = 0; i < 3; i++) {
  setTimeout(() => {
    this.effects.spawnRing(center, radius, COLOR.fire, 0.3);
  }, i * 100);
}
```

### Conditional Effect
```javascript
if (criticalHit) {
  this.effects.spawnImpact(position, 3.0, COLOR.yellow, 2.0);
} else {
  this.effects.spawnImpact(position, 1.5, COLOR.fire, 1.0);
}
```

## Need Help?

- **Full documentation:** `EFFECTS_REFACTOR.md`
- **Migration guide:** `EFFECTS_MIGRATION_EXAMPLE.md`
- **Summary:** `REFACTOR_SUMMARY.md`
- **Check registry:** `src/effects_registry.js` for examples
- **Check base effects:** `src/effects_base.js` for primitives