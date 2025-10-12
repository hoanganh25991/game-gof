# Performance Diagnostic Guide

## Current Issue: MacBook Pro M2 Running at 49 FPS

### Expected Performance
- **MacBook Pro M2**: 120 FPS (8ms frame time)
- **Current**: 49 FPS (20ms frame time)

### Diagnostic Steps

#### 1. Check Device Tier Detection

**Open browser console and look for:**
```
[DeviceTier] Detection Results: {
  tier: "high",  // Should be "high" for M2 Mac
  score: XX,     // Should be 80+
  breakdown: {
    cpu: "10 cores",  // M2 Pro has 10 cores
    memory: "16 GB",  // Typical for M2 Pro
    ...
  }
}
```

**If tier is NOT "high":**
- The device is being misclassified
- Optimizations are incorrectly reducing quality
- This explains the low triangle count (20,658 vs expected 150,000)

#### 2. Check Mesh Optimizations

**Look for:**
```
[Meshes] Using segment multiplier: 1.0 Material: Standard
```

**If you see:**
- `multiplier: 0.5` or `multiplier: 0.3` → Wrongly optimized
- `Material: Lambert` → Wrongly using simple materials

#### 3. Performance Bottleneck Analysis

The 20ms frame time on M2 suggests a CPU bottleneck. Possible causes:

**A. Coordinator Overhead (Most Likely)**
The recent coordinator refactoring added function call overhead:
- Every frame: ~10+ coordinator method calls
- Property access through getters
- Try-catch blocks everywhere

**Impact**: Adds 2-5ms per frame

**B. Minimap Rendering**
Currently throttled to 150ms, but still renders complex canvas operations:
- 125 draw calls mentioned
- Road polylines, villages, enemies, portals

**Impact**: 1-3ms when it updates

**C. Update Loop Complexity**
The UpdateLoopCoordinator chains many operations:
```javascript
// Pseudo-code showing call chain depth
updateLoop.update()
  → entityCoordinator.getPlayer()
  → environmentCoordinator.getEnv()
  → playerSystem.updatePlayer()
  → enemiesSystem.update()
  → etc.
```

#### 4. Quick Tests

**Test 1: Disable Optimizations Temporarily**
In browser console:
```javascript
// Force HIGH tier
localStorage.setItem('forceHighTier', 'true');
location.reload();
```

**Test 2: Check Frame Budget**
In console:
```javascript
console.log('Frame budget:', window.__FRAME_BUDGET_MS);
```
Should be `10.0` for desktop, not higher.

**Test 3: Profile Update Loop**
```javascript
// In UpdateLoopCoordinator.update(), add timing:
const start = performance.now();
// ... existing code ...
console.log('Update took:', performance.now() - start, 'ms');
```

### Known Issues

#### Issue 1: Reversed Resolution Scoring (FIXED)
Higher resolution screens were getting LOWER scores, causing misclassification.

**Fix Applied:** Screen scoring now correctly awards more points for higher resolution.

#### Issue 2: IcosahedronGeometry Misuse (FIXED)  
Fire orbs were creating 1,280+ triangles each instead of 20-320.

**Fix Applied:** New `getOptimizedDetail()` function properly reduces detail level.

#### Issue 3: Coordinator Overhead (SUSPECTED)
The refactoring to coordinators may have introduced performance overhead.

**Solution:** May need to:
- Cache coordinator method results
- Reduce function call depth  
- Inline critical path operations
- Remove unnecessary try-catch blocks

### Next Steps

1. **Check console logs** for tier detection results
2. **Report back** what tier the MacBook is detected as
3. **If HIGH tier**: The issue is coordinator overhead, not tier detection
4. **If MEDIUM/LOW tier**: The device detection needs further fixes

### Expected Diagnosis

Based on 20,658 triangles (vs 150,000 expected):
- **Most Likely**: MacBook being detected as MEDIUM tier (0.5 multiplier)
- Triangle reduction: 150k × 0.5 ≈ 75k (but you're seeing 20k)
- This suggests HEAVY optimization being applied

The 49 FPS is then explained by:
- Wrong tier (MEDIUM) applying optimizations
- Coordinator overhead adding ~10ms
- Combined effect: 20ms frame time = 50 FPS

### Recommended Fixes

**Short Term:**
1. Verify tier detection works correctly
2. Add tier override option for testing
3. Profile update loop to measure coordinator overhead

**Long Term:**
1. Optimize coordinator call chains
2. Cache frequently accessed coordinator methods
3. Consider removing coordinators from critical path
4. Add performance monitoring dashboard
