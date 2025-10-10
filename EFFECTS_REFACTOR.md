# Effects System Refactor

## Overview

The effects system has been refactored to separate concerns and provide a more modular, maintainable architecture.

## Architecture

### 1. **Base Effects** (`effects_base.js`)
Generic, reusable visual effect primitives that are not tied to any specific skill or game mechanic.

**Key Methods:**
- `spawnBeam(from, to, color, life)` - Simple straight line beam
- `spawnArc(from, to, color, life, segments, amplitude)` - Wavy arc with turbulence
- `spawnImpact(point, radius, color, intensity)` - Explosion effect with pillars and bursts
- `spawnRing(center, radius, color, duration, width, opacity)` - Expanding ground ring
- `spawnSphere(position, radius, color, life, opacity)` - Sphere for flashes/explosions
- `spawnProjectile(from, to, opts)` - Traveling projectile with trail
- `spawnCage(center, radius, color, duration, bars, height)` - Vertical bar cage
- `spawnShield(entity, color, duration, radius)` - Shield bubble around entity
- `spawnOrbitingOrbs(entity, color, opts)` - Orbiting particles around entity

**Philosophy:** Base effects should be generic and reusable. They should NOT have names like "spawnFireball" or "spawnLightningBolt" - instead use generic names like "spawnProjectile" with color parameters.

### 2. **Skill Effects Registry** (`effects_registry.js`)
Maps skill IDs to their specific visual effect implementations.

**Key Features:**
- **Registry Pattern:** Skills register their effects by ID
- **Graceful Fallback:** Skills without custom effects get a default implementation with a console warning
- **No Hardcoded Methods:** Effects are looked up dynamically, not called by hardcoded method names
- **Easy Extension:** New skills can register effects at runtime

**Example Effect Implementation:**
```javascript
flame_chain: (baseEffects, params) => {
  const { from, to, targets, chain } = params;
  const colors = getSkillColors('flame_chain');
  
  if (chain && chain.length > 0) {
    // Draw chain connections
    for (let i = 0; i < chain.length - 1; i++) {
      const start = chain[i];
      const end = chain[i + 1];
      baseEffects.spawnArc(start, end, colors.arc, 0.15, 8, 0.4);
      baseEffects.spawnImpact(end, 1.2, colors.impact, 0.8);
    }
  }
}
```

**API:**
- `executeSkillEffect(skillId, baseEffects, params)` - Execute effect for a skill
- `hasSkillEffect(skillId)` - Check if skill has custom effect
- `registerSkillEffect(skillId, effectFn)` - Register new effect at runtime
- `getRegisteredSkillEffects()` - Get all registered skill IDs

### 3. **Skill FX Configuration** (`skills_fx.js`)
Defines color palettes and visual intensity for each skill.

**Structure:**
```javascript
{
  beam: "#ff6347",    // Color for beam/projectile effects
  arc: "#ff4500",     // Color for arcing/chaining effects
  impact: "#ffa500",  // Color for impact/explosion effects
  ring: "#ff8c00",    // Color for ground rings and AoE indicators
  hand: "#ff6347",    // Color for hand/casting flash effects
  shake: 0.2          // Camera shake intensity (0-1)
}
```

### 4. **Unified Effects Manager** (`effects.js`)
Combines base effects with skill registry and maintains backward compatibility.

**Key Features:**
- Extends `BaseEffects` for all primitive methods
- Adds `executeSkillEffect(skillId, params)` for skill-specific effects
- Maintains legacy methods for backward compatibility
- Provides UI feedback methods (pings, hints, etc.)

## Usage

### For Skill Implementations

**Old Way (Hardcoded):**
```javascript
// In skills.js - hardcoded method calls
this.effects.spawnFireStreamAuto(from, to, color, 0.12);
this.effects.spawnStrike(pos, radius, color);
```

**New Way (Registry):**
```javascript
// In skills.js - use registry
this.effects.executeSkillEffect('flame_chain', {
  from: handWorldPos(this.player),
  to: targetPos,
  chain: chainPositions,
  targets: hitEnemies
});
```

### Adding a New Skill Effect

1. **Add color configuration** in `skills_fx.js`:
```javascript
my_new_skill: {
  beam: "#ff6347",
  arc: "#ff4500",
  impact: "#ffa500",
  ring: "#ff8c00",
  hand: "#ff6347",
  shake: 0.25
}
```

2. **Register effect implementation** in `effects_registry.js`:
```javascript
my_new_skill: (baseEffects, params) => {
  const { from, to, center, radius } = params;
  const colors = getSkillColors('my_new_skill');
  
  // Use base effects to compose your visual
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
```

3. **Call from skill code**:
```javascript
this.effects.executeSkillEffect('my_new_skill', {
  from: handWorldPos(this.player),
  to: targetPos,
  center: impactCenter,
  radius: 5.0
});
```

### Skill Effect Categories

Based on `skills_docs.js`, skills are categorized by behavior:

1. **Chain Skills** - Hit initial target, then jump to nearby enemies
   - Example: `flame_chain`
   - Effects: beam → arc → impact (per jump)

2. **AOE Blast Skills** - Instant area damage centered on caster or point
   - Example: `inferno_blast`, `flame_nova`
   - Effects: ring expansion + radial beams + impacts

3. **Aura Skills** - Continuous area effect that follows caster
   - Example: `burning_aura`, `blazing_aura`
   - Effects: periodic ring pulses + orbiting particles

4. **Storm Skills** - Stationary area with multiple strikes over time
   - Example: `meteor_storm`, `lava_storm`
   - Effects: area ring + individual strike impacts

5. **Projectile/Beam Skills** - Single-target hitscan or projectile
   - Example: `fire_bolt`, `fireball`, `flame_spear`
   - Effects: beam/projectile + impact

6. **Nova/Ring Skills** - Expanding shockwave from caster
   - Example: `flame_ring`, `ember_burst`, `pyroclasm`
   - Effects: expanding rings + radial beams + central impact

## Benefits

### 1. **Separation of Concerns**
- Base effects: Generic primitives
- Skill effects: Skill-specific compositions
- FX config: Visual styling

### 2. **No Hardcoded Method Names**
- Effects are looked up by skill ID
- Easy to add new skills without modifying effects.js
- Graceful fallback for missing effects

### 3. **Better Maintainability**
- Each skill effect is self-contained
- Easy to find and modify specific skill visuals
- Clear structure and documentation

### 4. **Extensibility**
- Runtime registration of new effects
- Easy to override or extend existing effects
- Plugin-friendly architecture

### 5. **Backward Compatibility**
- Legacy methods preserved in EffectsManager
- Existing code continues to work
- Gradual migration path

## Migration Guide

### Phase 1: Immediate (Done)
- ✅ Create base effects module
- ✅ Create effects registry
- ✅ Update skills_fx.js with comprehensive configs
- ✅ Create unified EffectsManager with backward compatibility

### Phase 2: Gradual Migration
- Update skills.js to use `executeSkillEffect()` instead of direct method calls
- Test each skill individually
- Remove deprecated methods once all skills migrated

### Phase 3: Cleanup
- Remove legacy compatibility methods
- Optimize effect implementations
- Add more base effect primitives as needed

## Testing

To test the new system:

1. **Verify backward compatibility:**
   - All existing skills should work without changes
   - No visual regressions

2. **Test new registry system:**
   - Call `effects.executeSkillEffect('flame_chain', params)`
   - Verify correct visual appears
   - Check console for warnings on missing effects

3. **Test fallback:**
   - Call effect for non-existent skill
   - Should see console warning
   - Should see default effect (beam + impact)

## Future Enhancements

1. **Effect Modifiers:**
   - Intensity scaling based on skill level
   - Color variations based on player customization
   - Quality-based effect variations

2. **Effect Pooling:**
   - Reuse geometry/materials for common effects
   - Reduce garbage collection pressure

3. **Effect Sequencing:**
   - Timeline-based effect composition
   - Easier to create complex multi-stage effects

4. **Effect Editor:**
   - Visual tool to design and preview effects
   - Export to registry format

## Files Changed

- ✅ `src/effects_base.js` - NEW: Base effect primitives
- ✅ `src/effects_registry.js` - NEW: Skill effect registry
- ✅ `src/effects.js` - MODIFIED: Now extends BaseEffects with registry integration
- ✅ `src/skills_fx.js` - MODIFIED: Enhanced with comprehensive skill configs
- ✅ `src/effects_old_backup.js` - BACKUP: Original effects.js preserved

## Notes

- The old `effects.js` is backed up as `effects_old_backup.js`
- All existing code should continue to work without changes
- New skills should use the registry pattern
- Console warnings will help identify skills needing custom effects