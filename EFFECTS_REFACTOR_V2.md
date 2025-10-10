# Effects System Refactor V2 - Realistic Skill Effects

## Overview
This refactor removes dependency on `effects_base.js` primitives for skill effects and creates unique, realistic THREE.js effects for each skill directly in their effect files.

## Key Changes

### 1. **effects_base.js** - System Effects Only
`effects_base.js` is now reserved ONLY for basic system effects:
- Basic attacks (player and enemy)
- Hit indicators
- UI feedback (move pings, target pings)
- Generic primitives that system code uses

**Skill effects NO LONGER use these primitives.**

### 2. **Individual Skill Effects** - Unique Implementations
Each skill in `src/effects/` now has its own unique, realistic visual implementation using THREE.js directly.

## Completed Realistic Effects

### ✅ meteor_storm.js
**What makes it unique:**
- Actual 3D meteor (dodecahedron) falling from sky at height 20
- Layered meteor: dark rock core + fire layer + bright glow
- Animated falling with acceleration and rotation
- Fire and smoke trail particles spawned during fall
- Massive crater impact with:
  - Scorched earth ring
  - Bright explosion flash
  - Multiple expanding shockwaves
  - 50 debris particles (rocks and fire) with physics
  - 8 fire pillars shooting up
  - Lingering fire ring with pulse effect

**Key technique:** `requestAnimationFrame` loop for smooth meteor fall animation

### ✅ fireball.js
**What makes it unique:**
- 3D layered fireball: yellow core + orange middle + red outer flames
- All three layers spin and pulse during flight
- Spiral trail particles (4 particles rotating around flight path)
- Flame trail particles left behind
- Multi-stage explosion:
  - White-yellow flash
  - Expanding fireball sphere
  - 4 expanding shockwave rings
  - 40 flying ember particles with physics
  - 6 fire pillars
  - Ground scorch mark

**Key technique:** Layered geometry with different opacities for depth

### ✅ volcanic_wrath.js
**What makes it unique:**
- Actual 3D volcano cone (ConeGeometry) with dark rock material
- 8 glowing lava cracks on the cone surface
- Massive lava eruption from crater (60 particles shooting up)
- 5 lava geysers around the area with particle fountains
- 8 black smoke columns with rising smoke particles
- 12 lava bombs with realistic arcing trajectories:
  - Parabolic arc physics
  - Rotation during flight
  - Trail particles
  - Impact creates molten splash
- Molten ground pools with pulse effect

**Key technique:** Parabolic arc calculation for realistic projectile motion

### ✅ flame_spear.js
**What makes it unique:**
- Actual 3D spear model:
  - Brown wooden shaft (cylinder)
  - Silver blade (cone)
  - Flame aura around spear
  - Glowing gold tip
- Spear oriented toward target using atan2
- Spinning rotation during flight
- Spiral flame trail (4 particles spiraling around path)
- Flame trail particles
- Tip glow trail
- Piercing impact:
  - Bright flash
  - Piercing beam continuing through target
  - Secondary impact at pierce end
  - 3 expanding shockwaves
  - 30 fire burst particles
  - 4 fire pillars
  - Ground scorch

**Key technique:** 3D model composition with proper orientation using rotation matrices

## Architecture Pattern

All realistic effects follow this pattern:

```javascript
import * as THREE from "../../vendor/three/build/three.module.js";
import { SKILL_FX } from "../skills_fx.js";
import { now } from "../utils.js";
import { FX } from "../constants.js";

export default function skillEffect(baseEffects, params) {
  // 1. Extract parameters
  const { from, to, center, radius } = params;
  const fx = SKILL_FX.skill_id || {};
  
  // 2. Create 3D models using THREE.js
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);
  
  // 3. Add to scene
  baseEffects.scene.add(group);
  
  // 4. Animate using requestAnimationFrame
  const startTime = now();
  const animate = () => {
    const elapsed = (now() - startTime) / 1000;
    const progress = Math.min(1, elapsed / duration);
    
    if (progress < 1) {
      // Update position, rotation, scale
      group.position.lerp(target, progress);
      group.rotation.y += 0.1;
      
      // Spawn trail particles
      spawnTrailParticle();
      
      requestAnimationFrame(animate);
    } else {
      // Cleanup and create impact effect
      baseEffects.scene.remove(group);
      geometry.dispose();
      material.dispose();
      
      createImpactEffect();
    }
  };
  
  animate();
}

// Helper function for impact
function createImpactEffect(position, baseEffects) {
  // Create explosion, shockwaves, particles, etc.
}
```

## Key Techniques Used

### 1. **3D Model Composition**
```javascript
const group = new THREE.Group();
group.add(core);
group.add(middleLayer);
group.add(outerLayer);
```

### 2. **Smooth Animation**
```javascript
const animate = () => {
  const progress = (now() - startTime) / duration;
  if (progress < 1) {
    updatePosition(progress);
    requestAnimationFrame(animate);
  }
};
```

### 3. **Particle Systems**
```javascript
for (let i = 0; i < count; i++) {
  const particle = createParticle();
  baseEffects.queue.push({
    obj: particle,
    particle: true,
    velocity: new THREE.Vector3(x, y, z),
    gravity: -10
  });
}
```

### 4. **Shockwave Expansion**
```javascript
baseEffects.queue.push({
  obj: ring,
  shockwave: true,
  shockwaveMaxRadius: maxRadius,
  shockwaveStartTime: now(),
  shockwaveDuration: duration
});
```

### 5. **Parabolic Arcs**
```javascript
const height = startHeight + Math.sin(progress * Math.PI) * arcHeight;
position.y = height;
```

## Remaining Skills to Update

The following skills still use `effects_base.js` primitives and should be updated with unique effects:

### High Priority (Visually Important)
1. **lava_storm.js** - Should have bubbling lava pools, geysers
2. **fire_dome.js** - Should have actual dome structure with pillars
3. **flame_nova.js** - Should have expanding nova wave
4. **inferno_blast.js** - Should have massive explosion
5. **heatwave.js** - Should have visible heat distortion wave

### Medium Priority
6. **flame_chain.js** - Should have chain links connecting targets
7. **flame_ring.js** - Should have rotating ring of flames
8. **pyroclasm.js** - Should have ground eruptions
9. **ember_burst.js** - Should have burst of embers

### Lower Priority (Auras/Fields)
10. **burning_aura.js** - Floating embers around player
11. **blazing_aura.js** - Intense heat waves
12. **scorching_field.js** - Ground fire with cracks
13. **inferno_overload.js** - Massive aura explosion

### Simple Effects
14. **fire_bolt.js** - Fast bolt projectile
15. **fire_bomb.js** - Bomb with delayed explosion

## Implementation Guide

For each remaining skill:

1. **Research the skill name** - What should "Lava Storm" actually look like?
2. **Design the visual** - Sketch out the key elements
3. **Create 3D models** - Use appropriate THREE.js geometries
4. **Add animation** - Use requestAnimationFrame for smooth motion
5. **Add particles** - Enhance with particle effects
6. **Add impact** - Create satisfying impact/explosion
7. **Test and iterate** - Adjust timing, colors, sizes

## Benefits of This Approach

1. **Unique visuals** - Each skill looks completely different
2. **Realistic effects** - Meteors actually fall, spears actually fly
3. **Better performance** - Direct THREE.js is more efficient
4. **Easier to understand** - Each effect is self-contained
5. **Easier to modify** - Change one skill without affecting others
6. **More impressive** - Complex 3D models vs simple primitives

## Migration Checklist

For each skill effect file:

- [ ] Remove all `baseEffects.spawnXXX()` calls
- [ ] Create unique 3D models using THREE.js
- [ ] Implement custom animation loop
- [ ] Add particle systems
- [ ] Add impact effects
- [ ] Test in-game
- [ ] Adjust timing and visuals

## Notes

- `baseEffects.scene` - Use this to add objects to the scene
- `baseEffects.transient` - Use this for temporary effects
- `baseEffects.indicators` - Use this for ground indicators
- `baseEffects.queue` - Use this for automatic cleanup and animation
- `now()` - Use this for timing (returns milliseconds)
- `FX.timeScale` - Multiply durations by this for game speed

## Example: Converting a Simple Effect

**Before (using primitives):**
```javascript
export default function simpleEffect(baseEffects, params) {
  baseEffects.spawnProjectile(from, to, {
    color: "#ff0000",
    size: 0.5,
    onComplete: (pos) => {
      baseEffects.spawnImpact(pos, 2.0, "#ff0000");
    }
  });
}
```

**After (unique realistic effect):**
```javascript
export default function simpleEffect(baseEffects, params) {
  // Create custom projectile
  const projectile = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  projectile.position.copy(from);
  baseEffects.scene.add(projectile);
  
  // Animate
  const startTime = now();
  const duration = from.distanceTo(to) / 20;
  
  const animate = () => {
    const progress = (now() - startTime) / 1000 / duration;
    
    if (progress < 1) {
      projectile.position.lerpVectors(from, to, progress);
      projectile.rotation.x += 0.1;
      
      // Spawn trail
      if (Math.random() > 0.5) {
        const trail = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff6347, transparent: true, opacity: 0.8 })
        );
        trail.position.copy(projectile.position);
        baseEffects.transient.add(trail);
        baseEffects.queue.push({
          obj: trail,
          until: now() + 0.3 * FX.timeScale,
          fade: true,
          mat: trail.material
        });
      }
      
      requestAnimationFrame(animate);
    } else {
      // Impact
      baseEffects.scene.remove(projectile);
      createCustomImpact(to, baseEffects);
    }
  };
  
  animate();
}
```

## Conclusion

This refactor creates a more impressive, realistic, and maintainable effects system. Each skill now has its own unique visual identity that matches its name and theme.