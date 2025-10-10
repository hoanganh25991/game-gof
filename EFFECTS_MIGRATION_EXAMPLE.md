# Effects System Migration Example

## Example: Migrating Flame Chain Skill

This document shows how to migrate a skill from the old hardcoded effects to the new registry-based system.

### Before (Old System)

In `skills.js`, the `_castChain` method directly calls effect methods:

```javascript
_castChain(key) {
  const SK = getSkill(key);
  // ... validation code ...
  
  // OLD: Hardcoded effect method calls
  this.effects.spawnHandFlash(this.player);
  this.effects.spawnHandLink(this.player, 0.06);
  this.effects.spawnHandCrackle(this.player, false, 1.0);
  
  // ... targeting logic ...
  
  while (current && jumps-- > 0) {
    const hitPoint = __vA.copy(current.pos()).add(__vB.set(0, 1.2, 0)).clone();
    
    // OLD: Multiple hardcoded calls
    this.effects.spawnFireStreamAuto(lastPoint, hitPoint, this._fx(SK).beam, 0.12);
    this.effects.spawnArcNoisePath(lastPoint, hitPoint, this._fx(SK).arc, 0.08);
    this.effects.spawnStrike(current.pos(), 1.2, this._fx(SK).impact);
    this.effects.spawnHitDecal(current.pos(), this._fx(SK).ring);
    this.effects.spawnRingPulse(current.pos(), 1.2, this._fx(SK).ring, 0.3, 0.5, 0.45);
    
    // ... damage logic ...
    lastPoint = hitPoint;
  }
}
```

**Problems:**
- Hardcoded method names tied to "fire" theme
- Effect logic mixed with skill logic
- Hard to reuse or modify effects
- Difficult to add new skills

### After (New System)

#### Step 1: Hand/Casting Effects (Keep as-is for now)

Hand effects are player-specific and can remain as direct calls:

```javascript
_castChain(key) {
  const SK = getSkill(key);
  // ... validation code ...
  
  // Hand effects - these are fine to keep as direct calls
  this.effects.spawnHandFlash(this.player);
  this.effects.spawnHandLink(this.player, 0.06);
  this.effects.spawnHandCrackle(this.player, false, 1.0);
  
  // ... targeting logic ...
```

#### Step 2: Collect Chain Data

Instead of calling effects in the loop, collect the chain data:

```javascript
  const chainPositions = [];
  const chainTargets = [];
  
  while (current && jumps-- > 0) {
    const hitPoint = __vA.copy(current.pos()).add(__vB.set(0, 1.2, 0)).clone();
    
    chainPositions.push(hitPoint.clone());
    chainTargets.push(current);
    
    // Apply damage
    const dmgHit = this.scaleSkillDamage(SK.dmg || 0);
    current.takeDamage(dmgHit);
    if (SK.slowFactor) {
      current.slowUntil = now() + (SK.slowDuration || 1.2);
      current.slowFactor = SK.slowFactor;
    }
    
    // ... find next target ...
    lastPoint = hitPoint;
  }
```

#### Step 3: Call Registry Effect

After collecting all data, make a single call to the registry:

```javascript
  // NEW: Single call to registry with all data
  this.effects.executeSkillEffect(SK.id, {
    player: this.player,
    from: handWorldPos(this.player),
    chain: chainPositions,
    targets: chainTargets
  });
```

#### Step 4: Complete Refactored Method

```javascript
_castChain(key) {
  const SK = getSkill(key);
  if (!SK) return;
  if (this.isOnCooldown(key)) return;
  
  // Hand effects
  audio.sfx("cast_chain");
  this.effects.spawnHandFlash(this.player);
  this.effects.spawnHandLink(this.player, 0.06);
  this.effects.spawnHandCrackle(this.player, false, 1.0);
  this.effects.spawnHandCrackle(this.player, true, 1.0);
  
  // Targeting
  const effRange = Math.max(SK.range || 0, WORLD.attackRange * (WORLD.attackRangeMult || 1));
  let candidates = this.enemies.filter(
    (e) => e.alive && distance2D(this.player.pos(), e.pos()) <= effRange
  );
  
  if (candidates.length === 0) {
    // Miss fallback
    const from = handWorldPos(this.player);
    const dir = __vB.set(0, 0, 1).applyQuaternion(this.player.mesh.quaternion).normalize();
    const to = __vC.copy(from).add(dir.multiplyScalar(effRange));
    
    this.effects.executeSkillEffect(SK.id, {
      player: this.player,
      from: from,
      to: to,
      miss: true
    });
    
    this.player.spend(SK.mana);
    this.startCooldown(key, SK.cd);
    return;
  }
  
  if (!this.player.canSpend(SK.mana)) return;
  this.player.spend(SK.mana);
  this.startCooldown(key, SK.cd);
  
  // Build chain
  let current = this._pickTargetInAim(effRange, 12) || candidates[0];
  const chainPositions = [handWorldPos(this.player)];
  const chainTargets = [];
  let jumps = (SK.jumps || 0) + 1;
  
  while (current && jumps-- > 0) {
    const hitPoint = __vA.copy(current.pos()).add(__vB.set(0, 1.2, 0)).clone();
    chainPositions.push(hitPoint.clone());
    chainTargets.push(current);
    
    // Apply damage and effects
    const dmgHit = this.scaleSkillDamage(SK.dmg || 0);
    current.takeDamage(dmgHit);
    if (SK.slowFactor) {
      current.slowUntil = now() + (SK.slowDuration || 1.2);
      current.slowFactor = SK.slowFactor;
    }
    
    audio.sfx("chain_hit");
    this.effects.spawnDamagePopup(current.pos(), dmgHit);
    
    // Find next target
    candidates = this.enemies
      .filter(e => e.alive && e !== current && 
              distance2D(current.pos(), e.pos()) <= ((SK.jumpRange || 0) + 2.5))
      .sort((a, b) => distance2D(current.pos(), a.pos()) - distance2D(current.pos(), b.pos()));
    current = candidates[0];
  }
  
  // Execute visual effect once with all chain data
  this.effects.executeSkillEffect(SK.id, {
    player: this.player,
    from: chainPositions[0],
    chain: chainPositions,
    targets: chainTargets
  });
  
  // Camera shake
  const fx = this._fx(SK);
  this._requestShake(fx.shake || 0);
}
```

### Benefits of New Approach

1. **Cleaner Skill Logic:**
   - Skill code focuses on game logic (targeting, damage, cooldowns)
   - Visual effects are separate concern

2. **Reusable Effects:**
   - Effect implementation in registry can be reused
   - Easy to create variations (ice chain, lightning chain, etc.)

3. **Easier to Modify:**
   - Change visuals without touching skill logic
   - A/B test different visual styles

4. **Better Performance:**
   - Can batch effect creation
   - Easier to optimize effect rendering

5. **Maintainable:**
   - Clear separation of concerns
   - Easy to find and fix visual bugs

## Migration Checklist

For each skill type:

### Chain Skills
- [ ] Collect chain positions and targets
- [ ] Call `executeSkillEffect` with chain data
- [ ] Keep damage/gameplay logic in skill code
- [ ] Test visual matches original

### AOE Skills
- [ ] Collect center point and radius
- [ ] Collect affected targets
- [ ] Call `executeSkillEffect` with AOE data
- [ ] Test visual matches original

### Aura Skills
- [ ] Call `executeSkillEffect` on activation
- [ ] Call `executeSkillEffect` on each tick with `tick: true`
- [ ] Pass affected targets per tick
- [ ] Test visual matches original

### Storm Skills
- [ ] Call `executeSkillEffect` on activation with area
- [ ] Call `executeSkillEffect` per strike with strike position
- [ ] Pass `strike: true` and `strikePos` for individual strikes
- [ ] Test visual matches original

### Projectile Skills
- [ ] Call `executeSkillEffect` with from/to positions
- [ ] Let registry handle projectile creation
- [ ] Test visual matches original

## Testing Strategy

1. **Visual Comparison:**
   - Record video of old effect
   - Implement new effect
   - Compare side-by-side

2. **Performance Testing:**
   - Measure FPS before/after
   - Check memory usage
   - Verify no regressions

3. **Edge Cases:**
   - Test with no targets
   - Test with max targets
   - Test at different quality settings

4. **Console Monitoring:**
   - Check for warnings
   - Verify no errors
   - Confirm effect execution

## Rollback Plan

If issues arise:

1. **Immediate:** Revert to backup
   ```bash
   cp src/effects_old_backup.js src/effects.js
   ```

2. **Partial:** Keep new system but use legacy methods
   ```javascript
   // Instead of registry
   this.effects.executeSkillEffect(SK.id, params);
   
   // Use legacy methods
   this.effects.spawnFireStreamAuto(from, to, color, life);
   ```

3. **Gradual:** Migrate one skill at a time
   - Test each skill thoroughly
   - Only migrate when confident
   - Keep both systems running in parallel