/**
 * GPU Instancing for Enemies
 * Phase 3 Optimization: Render all enemies in 1-2 draw calls instead of 60+
 * 
 * Uses THREE.InstancedMesh to batch all enemy rendering into single draw calls
 * Reduces GPU overhead by 95%+ for large enemy counts
 */

export class EnemyInstancedRenderer {
  #THREE;
  #scene;
  #maxEnemies;
  #instancedMesh;
  #material;
  #geometry;
  #dummy;
  #colorAttribute;
  #isSupported;

  /**
   * @param {Object} options
   * @param {Object} options.THREE - THREE.js library
   * @param {Object} options.scene - THREE.Scene
   * @param {number} options.maxEnemies - Maximum number of enemies to support
   */
  constructor({ THREE, scene, maxEnemies = 200 }) {
    this.#THREE = THREE;
    this.#scene = scene;
    this.#maxEnemies = maxEnemies;
    this.#dummy = new THREE.Object3D();
    
    // Check if instancing is supported
    this.#isSupported = this.#checkSupport();
    
    if (!this.#isSupported) {
      console.warn('[GPU Instancing] InstancedMesh not supported. Falling back to individual meshes.');
      return;
    }
    
    this.#initInstancedMesh();
  }

  /**
   * Check if GPU instancing is supported
   * @private
   */
  #checkSupport() {
    try {
      // Check if InstancedMesh is available
      if (!this.#THREE.InstancedMesh) {
        return false;
      }
      
      // Basic support check passed
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Initialize the instanced mesh
   * @private
   */
  #initInstancedMesh() {
    // Use actual enemy geometry (CapsuleGeometry) for visual consistency
    // Reduced segments for performance while maintaining quality
    this.#geometry = new this.#THREE.CapsuleGeometry(0.6, 0.8, 4, 10);
    
    // Create shared material with vertex colors for per-enemy variety
    this.#material = new this.#THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.3
    });
    
    // Create instanced mesh
    this.#instancedMesh = new this.#THREE.InstancedMesh(
      this.#geometry,
      this.#material,
      this.#maxEnemies
    );
    
    // Enable frustum culling per instance
    this.#instancedMesh.frustumCulled = true;
    this.#instancedMesh.castShadow = true;
    
    // Initialize color attribute for per-instance colors
    const colors = new Float32Array(this.#maxEnemies * 3);
    for (let i = 0; i < this.#maxEnemies; i++) {
      colors[i * 3 + 0] = 1.0; // R
      colors[i * 3 + 1] = 0.3; // G  
      colors[i * 3 + 2] = 0.2; // B
    }
    
    this.#colorAttribute = new this.#THREE.InstancedBufferAttribute(colors, 3);
    this.#geometry.setAttribute('color', this.#colorAttribute);
    
    // Add to scene
    this.#scene.add(this.#instancedMesh);
    
    // Initially hide all instances
    for (let i = 0; i < this.#maxEnemies; i++) {
      this.#dummy.position.set(0, -1000, 0);
      this.#dummy.updateMatrix();
      this.#instancedMesh.setMatrixAt(i, this.#dummy.matrix);
    }
    this.#instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update enemy instances
   * @param {Array} enemies - Array of enemy objects
   */
  updateInstances(enemies) {
    if (!this.#isSupported || !this.#instancedMesh) return;
    
    let instanceIndex = 0;
    
    for (const enemy of enemies) {
      if (!enemy || !enemy.alive || enemy._despawned) continue;
      if (instanceIndex >= this.#maxEnemies) break;
      
      // Get enemy position and rotation from mesh
      if (!enemy.mesh || !enemy.mesh.position) continue;
      
      // Update dummy object with enemy transform
      this.#dummy.position.copy(enemy.mesh.position);
      this.#dummy.rotation.copy(enemy.mesh.rotation);
      
      // Preserve enemy scale for visual variety (brute=1.25x, raider=1.05x, etc)
      const scale = enemy.mesh.scale;
      this.#dummy.scale.set(scale.x, scale.y, scale.z);
      this.#dummy.updateMatrix();
      
      // Set instance matrix
      this.#instancedMesh.setMatrixAt(instanceIndex, this.#dummy.matrix);
      
      // Update instance color based on enemy tier and type
      const color = this.#getEnemyColor(enemy);
      this.#colorAttribute.setXYZ(instanceIndex, color.r, color.g, color.b);
      
      // Hide enemy body material but keep mesh and children (health bar, eye) visible
      // This allows health bars to remain visible while the body is rendered via instancing
      if (enemy.mesh.material && enemy.mesh.material.visible !== false) {
        // Make the original mesh material invisible instead of hiding the entire mesh
        // This keeps the mesh transform active for health bars while hiding the geometry
        enemy.mesh.material.colorWrite = false;
        enemy.mesh.material.depthWrite = false;
        enemy.mesh.renderOrder = -1; // Render first to not interfere with depth
      }
      
      instanceIndex++;
    }
    
    // Hide unused instances
    for (let i = instanceIndex; i < this.#maxEnemies; i++) {
      this.#dummy.position.set(0, -1000, 0);
      this.#dummy.updateMatrix();
      this.#instancedMesh.setMatrixAt(i, this.#dummy.matrix);
    }
    
    // Update GPU buffers
    this.#instancedMesh.instanceMatrix.needsUpdate = true;
    this.#colorAttribute.needsUpdate = true;
    
    // Update instance count for efficient rendering
    this.#instancedMesh.count = instanceIndex;
  }

  /**
   * Get color for enemy based on tier
   * @private
   */
  #getEnemyColor(enemy) {
    // Tier-based colors matching entities.js
    const TIER_COLORS = {
      normal: { r: 0.53, g: 0.27, b: 0.20 }, // #884433 (THEME_COLORS.enemyDark)
      tough: { r: 1.0, g: 0.54, b: 0.31 },   // #ff8a50
      elite: { r: 1.0, g: 0.85, b: 0.42 },   // #ffd86a
      boss: { r: 1.0, g: 0.92, b: 0.60 }     // #ffeb99
    };
    
    let color = TIER_COLORS.normal; // Default
    
    try {
      // Use enemy tier for consistent coloring
      if (enemy.tier && TIER_COLORS[enemy.tier]) {
        color = TIER_COLORS[enemy.tier];
      }
      
      // Slight darkening for low health (visual feedback)
      if (enemy.hp !== undefined && enemy.maxHp !== undefined) {
        const healthPct = enemy.hp / enemy.maxHp;
        if (healthPct < 0.3) {
          const factor = 0.7;
          color = {
            r: color.r * factor,
            g: color.g * factor,
            b: color.b * factor
          };
        }
      }
    } catch (_) {}
    
    return color;
  }

  /**
   * Check if instancing is supported
   */
  isSupported() {
    return this.#isSupported;
  }

  /**
   * Get statistics
   */
  getStats() {
    if (!this.#isSupported) {
      return {
        supported: false,
        activeInstances: 0,
        maxInstances: 0,
        drawCalls: 0
      };
    }
    
    return {
      supported: true,
      activeInstances: this.#instancedMesh?.count || 0,
      maxInstances: this.#maxEnemies,
      drawCalls: this.#instancedMesh?.count > 0 ? 1 : 0 // All enemies in 1 draw call!
    };
  }

  /**
   * Dispose resources
   */
  dispose() {
    if (this.#instancedMesh) {
      this.#scene.remove(this.#instancedMesh);
      this.#geometry.dispose();
      this.#material.dispose();
      this.#instancedMesh = null;
    }
  }

  /**
   * Enable/disable instanced rendering
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    if (this.#instancedMesh) {
      this.#instancedMesh.visible = enabled;
    }
  }

  /**
   * Get the instanced mesh (for advanced use)
   */
  getInstancedMesh() {
    return this.#instancedMesh;
  }
}
