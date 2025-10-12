# Performance Optimization Plan: CPU to GPU Migration

## Problem Analysis

### Current State: 100% CPU Usage Across All Tiers
The game is CPU-bound regardless of device tier (HIGH/MEDIUM/LOW) because:

1. **CPU-Bound Collision Detection**
   - Every frame, each enemy checks distance to:
     - Player (O(n) where n = number of enemies)
     - Villages (O(n×m) where m = discovered villages)
     - Structures (O(n×s) where s = structures)
   - Example: 50 enemies × 5 villages × 10 structures = 2,500 distance calculations/frame
   - At 60 FPS: 150,000 calculations/second on CPU

2. **CPU-Bound Raycasting**
   - Three.js Raycaster intersects meshes on CPU
   - Every mouse click/touch traverses entire scene graph
   - No GPU picking/selection

3. **No Spatial Partitioning**
   - O(n²) complexity for proximity checks
   - Every enemy checks every other entity
   - No octree, grid, or spatial hash

4. **Single-Threaded JavaScript**
   - All game logic runs on main thread
   - No Web Workers for AI/pathfinding
   - Blocks rendering pipeline

5. **Inefficient Update Loop**
   - Fixed update rate (every frame)
   - No delta accumulation for physics
   - Unnecessary recalculations

## Root Cause: Architectural Design Flaw

The game was designed as a **CPU-intensive** game when it should be **GPU-intensive**:
- GPUs excel at parallel calculations (collision, physics, rendering)
- CPUs excel at sequential logic (game state, AI decisions)
- Current design does opposite: complex math on CPU, simple rendering on GPU

## Solution: Multi-Phase GPU Migration

### Phase 1: GPU Capability Detection & Warnings ⚡ (Quick Win)
**Effort**: 2-3 hours
**Impact**: User awareness + graceful degradation

1. **Detect GPU Capabilities**
   ```javascript
   - WebGL extensions (compute shader support)
   - GPU model/vendor
   - Max texture size
   - Shader precision
   ```

2. **Show Warnings**
   - If no WebGL2: "Your device lacks GPU acceleration. Performance will be limited."
   - If low-end GPU: "Weak GPU detected. Consider reducing quality settings."
   - Display in Settings → Info tab

3. **Metrics**
   - Add GPU utilization % to Info tab
   - Show GPU memory usage
   - Track GPU vs CPU time

### Phase 2: Spatial Partitioning 🎯 (High Impact, Medium Effort)
**Effort**: 4-6 hours
**Impact**: Reduce collision checks from O(n²) to O(n log n)

1. **Implement Spatial Grid**
   ```javascript
   class SpatialGrid {
     constructor(cellSize = 10) {
       this.cellSize = cellSize;
       this.grid = new Map();
     }
     
     insert(entity) {
       const cell = this.getCell(entity.position);
       this.grid.get(cell).push(entity);
     }
     
     getNearby(position, radius) {
       // Only check cells within radius
       // Reduces checks by 90%+
     }
   }
   ```

2. **Benefits**
   - 50 enemies across 100x100 world with 10-unit cells
   - Before: 50×50 = 2,500 checks
   - After: ~5 enemies per cell × 9 nearby cells = 45 checks
   - **98% reduction in collision checks**

### Phase 3: GPU-Based Collision Detection 🚀 (Highest Impact)
**Effort**: 8-12 hours
**Impact**: Offload 80%+ of CPU work to GPU

#### Option A: Transform Feedback (WebGL2)
Use GPU to calculate positions/collisions in parallel:

```javascript
// Vertex shader runs in parallel on GPU
attribute vec3 position;
attribute vec3 velocity;
uniform float deltaTime;
uniform sampler2D obstacleMap; // Terrain/structures

void main() {
  vec3 newPos = position + velocity * deltaTime;
  
  // GPU-parallel collision check
  float obstacleValue = texture2D(obstacleMap, newPos.xz).r;
  if (obstacleValue > 0.5) {
    newPos = position; // Blocked
  }
  
  gl_Position = vec4(newPos, 1.0);
}
```

**Benefits:**
- 1000 entities updated in parallel on GPU vs sequential on CPU
- Frees CPU for game logic
- Reduces CPU usage from 100% to ~20-30%

#### Option B: GPU Picking for Raycasting
Replace CPU raycaster with GPU-based picking:

```javascript
// Render scene to offscreen buffer with entity IDs as colors
// Read pixel at mouse position
// Instant selection without traversing scene graph
```

### Phase 4: Web Workers for AI 🧠 (Medium Impact)
**Effort**: 6-8 hours
**Impact**: Offload AI to separate thread

```javascript
// worker.js - Runs on separate CPU thread
self.onmessage = (e) => {
  const { enemies, player } = e.data;
  
  // Calculate AI decisions in parallel
  const decisions = enemies.map(enemy => ({
    id: enemy.id,
    action: calculateAI(enemy, player),
    target: findTarget(enemy, player)
  }));
  
  self.postMessage(decisions);
};
```

**Benefits:**
- AI calculations don't block rendering
- Better frame pacing
- Reduces main thread CPU by 20-30%

### Phase 5: Advanced Optimizations 🎨 (Polish)
**Effort**: 4-6 hours
**Impact**: Final 10-15% performance gain

1. **Object Pooling**
   - Reuse enemy/projectile objects
   - Eliminate garbage collection spikes

2. **LOD (Level of Detail)**
   - Distant enemies use simpler AI
   - Already partially implemented, needs tuning

3. **Fixed Timestep Physics**
   - Decouple physics from render loop
   - Accumulate delta time
   - More stable, less CPU intensive

4. **Batch Updates**
   - Update enemies in batches (already doing with stride)
   - Extend to other systems

## Implementation Priority

### Week 1: Quick Wins
- [ ] Phase 1: GPU detection + warnings (Day 1-2)
- [ ] Phase 2: Spatial grid (Day 3-5)
- [ ] Measure impact: Should reduce CPU to 60-70%

### Week 2: Major Improvements  
- [ ] Phase 3A: Transform feedback collision (Day 1-4)
- [ ] Phase 3B: GPU picking (Day 5)
- [ ] Measure impact: Should reduce CPU to 30-40%

### Week 3: Threading
- [ ] Phase 4: Web Workers for AI (Day 1-3)
- [ ] Phase 5: Polish & optimization (Day 4-5)
- [ ] Measure impact: Should reduce CPU to 20-30%

## Expected Performance Gains

### Current State
- **CPU**: 99.4% (game freezes)
- **GPU**: 20-30% (underutilized)
- **FPS**: 15-30 on tablets

### After Phase 1-2 (Spatial Grid)
- **CPU**: 60-70% (still high but playable)
- **GPU**: 20-30%
- **FPS**: 40-50 on tablets

### After Phase 3 (GPU Collision)
- **CPU**: 30-40% (smooth)
- **GPU**: 60-70% (properly utilized)
- **FPS**: 55-60 on tablets

### After Phase 4-5 (Workers + Polish)
- **CPU**: 20-30% (excellent)
- **GPU**: 70-80% (excellent utilization)
- **FPS**: 60 on tablets, 120 on desktop

## Technical Approach

### GPU Collision Detection Implementation

```javascript
// 1. Create collision texture (obstacles baked into texture)
const collisionTexture = new THREE.DataTexture(
  collisionData, // 0 = free, 1 = blocked
  worldWidth,
  worldHeight,
  THREE.RedFormat
);

// 2. Update shader for enemy movement
const enemyShader = `
  uniform sampler2D collisionMap;
  uniform vec2 worldSize;
  
  vec3 moveWithCollision(vec3 currentPos, vec3 velocity) {
    vec3 newPos = currentPos + velocity;
    vec2 uv = newPos.xz / worldSize;
    float collision = texture2D(collisionMap, uv).r;
    
    if (collision > 0.5) {
      return currentPos; // Blocked
    }
    return newPos;
  }
`;

// 3. GPU instanced rendering for enemies
const enemyGeometry = new THREE.InstancedBufferGeometry();
enemyGeometry.instanceCount = 1000; // All enemies in one draw call
```

### Spatial Grid Implementation

```javascript
class SpatialGrid {
  constructor(worldSize, cellSize = 10) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  
  getCellKey(x, z) {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }
  
  insert(entity) {
    const key = this.getCellKey(entity.position.x, entity.position.z);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(entity);
  }
  
  clear() {
    this.cells.clear();
  }
  
  getNearby(position, radius) {
    const cellRadius = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(position.x / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    const nearby = [];
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        const cell = this.cells.get(key);
        if (cell) nearby.push(...cell);
      }
    }
    
    return nearby;
  }
}

// Usage in EnemiesSystem
update(dt) {
  // Rebuild grid each frame (fast)
  this.spatialGrid.clear();
  this.enemies.forEach(e => this.spatialGrid.insert(e));
  
  // Check collisions only with nearby enemies
  for (const enemy of this.enemies) {
    const nearby = this.spatialGrid.getNearby(enemy.position, 5);
    // Process only 5-10 nearby enemies instead of all 50+
  }
}
```

## Metrics to Track

Add to Settings → Info tab:
- **CPU Usage**: Current % (already added)
- **GPU Usage**: % utilization
- **GPU Memory**: Used/Total
- **Collision Checks**: Per frame (before: 2500, after: 50)
- **Spatial Grid**: Cells active / Total cells
- **Worker Status**: Active/Idle
- **Frame Budget**: Used/Total ms

## Compatibility & Fallbacks

### WebGL2 Not Available
- Fall back to spatial grid only
- Disable GPU collision
- Show warning: "GPU acceleration unavailable"

### Low-End GPU
- Use simpler collision texture (lower resolution)
- Reduce instance count
- More aggressive LOD

### Mobile Devices
- Smaller collision texture (256×256 vs 1024×1024)
- Fewer worker threads (1 vs 4)
- More aggressive culling

## Success Criteria

✅ **Must Have (Phase 1-2)**
- CPU usage < 70% on tablets
- FPS ≥ 40 on middle-class devices
- GPU warnings displayed

✅ **Should Have (Phase 3)**
- CPU usage < 40% on tablets  
- GPU usage > 60%
- FPS ≥ 55 on middle-class devices

✅ **Nice to Have (Phase 4-5)**
- CPU usage < 30%
- GPU usage > 70%
- FPS = 60 on tablets, 120 on desktop

## Next Steps

**Immediate Action (Today)**:
1. Implement Phase 1: GPU detection + warnings
2. Add GPU metrics to Info tab
3. Test on your tablet

**This Week**:
1. Implement Phase 2: Spatial grid
2. Measure CPU reduction
3. Report results

**Following Weeks**:
1. Implement GPU collision if Phase 2 shows promise
2. Add Web Workers for AI
3. Final polish

Do you want me to start with Phase 1 (GPU detection + warnings) right now?
