# Effects Developer Guide

## Quick Start

### Adding a New Skill Effect

1. **Add configuration to `skills_fx.js`:**

```javascript
my_new_skill: {
  colors: {
    primary: "#ff0000",
    secondary: "#ff6600",
    accent: "#ffff00"
  },
  size: {
    projectile: 0.8,
    explosion: 2.0
  },
  particles: {
    count: 40,
    speed: 5.0,
    lifetime: 1.5
  },
  intensity: 1.5,
  shake: 0.3,
  custom: {
    // Your unique parameters
    trailLength: 10,
    rotationSpeed: 3.0
  }
}
```

2. **Create effect file `src/effects/my_new_skill.js`:**

```javascript
import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";

export default function myNewSkillEffect(baseEffects, params) {
  const { from, to, center, radius } = params;
  const fx = SKILL_FX.my_new_skill || {};
  const colors = fx.colors || {};
  const size = fx.size || {};
  const particles = fx.particles || {};
  const custom = fx.custom || {};
  
  // Your effect implementation
  baseEffects.spawnProjectile(from, to, {
    color: colors.primary,
    size: size.projectile,
    onComplete: (hitPos) => {
      baseEffects.spawnImpact(hitPos, size.explosion, colors.accent);
    }
  });
}
```

3. **That's it!** The effect will auto-load when the skill is used.

## Available Base Effects

### Projectiles & Beams

#### `spawnBeam(from, to, color, life)`
Simple straight line between two points.
```javascript
baseEffects.spawnBeam(from, to, "#ff0000", 0.3);
```

#### `spawnArc(from, to, color, life, segments, amplitude)`
Wavy arc with turbulence.
```javascript
baseEffects.spawnArc(from, to, "#ff6600", 0.4, 12, 0.8);
```

#### `spawnProjectile(from, to, options)`
Traveling projectile with trail and callback.
```javascript
baseEffects.spawnProjectile(from, to, {
  color: "#ff0000",
  size: 0.6,
  speed: 25,
  trail: true,
  onComplete: (hitPos) => {
    // Impact effect
  }
});
```

#### `spawnLightning(from, to, color, branches, duration)`
Jagged lightning bolt with branches.
```javascript
baseEffects.spawnLightning(from, to, "#ffff00", 3, 0.15);
```

### Explosions & Impacts

#### `spawnImpact(point, radius, color, intensity)`
Vertical beams and radial bursts.
```javascript
baseEffects.spawnImpact(position, 2.0, "#ff6600", 1.5);
```

#### `spawnSphere(position, radius, color, life, opacity)`
Glowing sphere (for explosions, flashes).
```javascript
baseEffects.spawnSphere(position, 1.5, "#ffff00", 0.4, 1.0);
```

#### `spawnCone(apex, direction, angle, length, color, rays, duration)`
Cone/fountain effect.
```javascript
baseEffects.spawnCone(
  position,
  new THREE.Vector3(0, 1, 0),  // Upward
  45,                           // 45-degree angle
  5,                            // 5 units tall
  "#ff6600",
  16,                           // 16 rays
  0.6
);
```

### Rings & Waves

#### `spawnRing(center, radius, color, duration, width, opacity)`
Ground ring that fades.
```javascript
baseEffects.spawnRing(center, 10, "#ff0000", 1.0, 0.8, 0.6);
```

#### `spawnShockwave(center, maxRadius, color, duration, thickness)`
Expanding ring wave.
```javascript
baseEffects.spawnShockwave(center, 15, "#ff6600", 0.8, 0.4);
```

### Pillars & Structures

#### `spawnPillar(position, height, radius, color, duration)`
Vertical column with glow.
```javascript
baseEffects.spawnPillar(position, 6, 0.5, "#ff0000", 1.0);
```

#### `spawnCage(center, radius, color, duration, bars, height)`
Cage of vertical bars.
```javascript
baseEffects.spawnCage(center, 12, "#ff6600", 1.5, 16, 3.0);
```

#### `spawnSpiral(center, radius, height, color, duration, turns)`
Spiral/tornado effect.
```javascript
baseEffects.spawnSpiral(center, 2.0, 6, "#ff0000", 1.2, 4);
```

### Particles

#### `spawnParticleBurst(center, count, color, speed, size, lifetime)`
Particle explosion with physics.
```javascript
baseEffects.spawnParticleBurst(
  center,
  50,           // 50 particles
  "#ff6600",
  8.0,          // Speed
  0.15,         // Size
  1.5           // Lifetime
);
```

### Special Effects

#### `spawnShield(entity, color, duration, radius)`
Shield bubble around entity.
```javascript
baseEffects.spawnShield(player, "#0088ff", 6.0, 2.0);
```

#### `spawnOrbitingOrbs(entity, color, options)`
Orbiting orbs around entity.
```javascript
baseEffects.spawnOrbitingOrbs(player, "#ff0000", {
  count: 4,
  radius: 1.5,
  duration: 3.0,
  size: 0.2,
  rate: 3.0
});
```

## Effect Patterns

### Pattern 1: Simple Projectile
```javascript
baseEffects.spawnProjectile(from, to, {
  color: colors.primary,
  size: 0.5,
  onComplete: (hitPos) => {
    baseEffects.spawnImpact(hitPos, 1.5, colors.accent);
    baseEffects.spawnRing(hitPos, 2.0, colors.secondary, 0.5);
  }
});
```

### Pattern 2: Area Effect
```javascript
// Base ring
baseEffects.spawnRing(center, radius, colors.primary, 1.0, 1.0, 0.6);

// Expanding shockwave
baseEffects.spawnShockwave(center, radius * 1.2, colors.accent, 0.8, 0.4);

// Particles
baseEffects.spawnParticleBurst(center, 40, colors.secondary, 5.0, 0.15, 1.5);
```

### Pattern 3: Multi-Stage Effect
```javascript
// Stage 1: Initial impact
baseEffects.spawnSphere(center, 2.0, colors.accent, 0.3, 1.0);

// Stage 2: Shockwaves (staggered)
for (let i = 0; i < 3; i++) {
  setTimeout(() => {
    baseEffects.spawnShockwave(
      center,
      radius * (i + 1) / 3,
      colors.primary,
      0.6,
      0.3
    );
  }, i * 150);
}

// Stage 3: Pillars
setTimeout(() => {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const pos = new THREE.Vector3(
      center.x + Math.cos(angle) * radius * 0.6,
      center.y,
      center.z + Math.sin(angle) * radius * 0.6
    );
    baseEffects.spawnPillar(pos, 5, 0.4, colors.secondary, 1.0);
  }
}, 200);
```

### Pattern 4: Continuous Effect (Aura)
```javascript
// Concentric rings
for (let i = 0; i < 3; i++) {
  const ringRadius = radius * (0.4 + i * 0.3);
  baseEffects.spawnRing(center, ringRadius, colors.primary, 0.8, 0.6, 0.5);
}

// Floating particles
for (let i = 0; i < 30; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * radius;
  const pos = new THREE.Vector3(
    center.x + Math.cos(angle) * dist,
    center.y,
    center.z + Math.sin(angle) * dist
  );
  
  const endPos = pos.clone();
  endPos.y += 3;
  
  baseEffects.spawnBeam(pos, endPos, colors.secondary, 2.0);
}
```

## Color Guidelines

### Fire Theme Colors:
- **Hot Core**: `#ffffff` (white), `#ffff00` (yellow)
- **Primary Flames**: `#ff4500` (orange-red), `#ff6347` (tomato)
- **Secondary Flames**: `#ffa500` (orange), `#ff8c00` (dark orange)
- **Accents**: `#ffd700` (gold), `#ff0000` (red)
- **Dark/Burnt**: `#8b0000` (dark red), `#2a1a0a` (charred)
- **Smoke**: `#1a1a1a` (black), `#2a2a2a` (dark gray)

### Color Intensity Progression:
1. **Weak**: Orange (`#ffa500`)
2. **Medium**: Orange-red (`#ff4500`)
3. **Strong**: Yellow (`#ffff00`)
4. **Intense**: White (`#ffffff`)

## Performance Tips

1. **Respect Quality Settings**: Particle counts auto-adjust
2. **Use setTimeout for Staging**: Spread effects over time
3. **Limit Particle Count**: 50-100 max for big effects
4. **Reuse Geometries**: Base effects handle this
5. **Short Lifetimes**: Keep effects brief (0.5-2.0 seconds)

## Common Parameters

### From `params` object:
- `from`: Source position (Vector3)
- `to`: Target position (Vector3)
- `center`: Center position (Vector3)
- `radius`: Effect radius (number)
- `strike`: Boolean for storm strikes
- `strikePos`: Strike position (Vector3)
- `targets`: Array of target positions
- `chain`: Array of chain positions
- `activation`: Boolean for initial activation

### From `fx` config:
- `colors`: Color palette object
- `size`: Size parameters object
- `particles`: Particle config object
- `intensity`: Visual intensity multiplier
- `shake`: Camera shake amount
- `custom`: Skill-specific parameters

## Testing Your Effect

1. **Start local server**: `python3 -m http.server 8000`
2. **Open browser**: `http://localhost:8000`
3. **Equip your skill**: Use the skill menu
4. **Test in combat**: Fight enemies to see the effect
5. **Adjust parameters**: Tune colors, sizes, timings in `skills_fx.js`
6. **Reload page**: See changes immediately

## Debugging

### Effect not showing:
- Check console for errors
- Verify skill ID matches filename
- Ensure skill is in `SKILLS_POOL`
- Check `from`/`to`/`center` parameters exist

### Performance issues:
- Reduce particle count
- Shorten effect lifetimes
- Remove setTimeout delays
- Simplify geometry

### Visual issues:
- Adjust colors in `skills_fx.js`
- Increase/decrease sizes
- Change opacity values
- Modify timing delays

## Examples from Existing Skills

See these files for reference:
- **Simple**: `fire_bolt.js` - Basic projectile
- **Medium**: `fireball.js` - Projectile with explosion
- **Complex**: `pyroclasm.js` - Multi-stage catastrophic effect
- **Aura**: `blazing_aura.js` - Continuous area effect
- **Storm**: `meteor_storm.js` - Repeated strikes

## Best Practices

1. **Start Simple**: Get basic effect working first
2. **Layer Effects**: Combine multiple primitives
3. **Use Timing**: Stage effects with setTimeout
4. **Test Performance**: Monitor FPS while testing
5. **Match Theme**: Keep visual style consistent
6. **Scale with Power**: Bigger skills = bigger effects
7. **Provide Feedback**: Clear visual indication of impact
8. **Be Unique**: Make each skill visually distinct

## Need Help?

- Check `EFFECTS_UPGRADE_SUMMARY.md` for overview
- Look at existing effect files for patterns
- Review `effects_base.js` for available primitives
- Test in-game and iterate on feedback