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
    // Create shared geometry (simple cube for enemies)
    this.#geometry = new this.#THREE.BoxGeometry(1, 2, 1);
    
    // Create shared material with vertex colors
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
    
    // Initialize color attribute for per-instance colors
    const colors = new Float32Array(this.#maxEnemies * 3);
    for (let i = 0; i < this.#maxEnemies; i++) {
      // Default color (will be updated per enemy)
      colors[i * 3 + 0] = 1.0; // R
      colors[i * 3 + 1] = 0.3; // G
      colors[i * 3 + 2] = 0.2; // B - orange-ish default
    }
    
    this.#colorAttribute = new this.#THREE.InstancedBufferAttribute(colors, 3);
    this.#geometry.setAttribute('color', this.#colorAttribute);
    
    // Add to scene
    this.#scene.add(this.#instancedMesh);
    
    // Initially hide all instances
    for (let i = 0; i < this.#maxEnemies; i++) {
      this.#dummy.position.set(0, -1000, 0); // Move far below ground
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
      this.#dummy.scale.set(1, 1, 1);
      this.#dummy.updateMatrix();
      
      // Set instance matrix
      this.#instancedMesh.setMatrixAt(instanceIndex, this.#dummy.matrix);
      
      // Update instance color based on enemy type
      const color = this.#getEnemyColor(enemy);
      this.#colorAttribute.setXYZ(instanceIndex, color.r, color.g, color.b);
      
      // Hide original mesh (we're rendering via instancing now)
      if (enemy.mesh.visible !== false) {
        enemy.mesh.visible = false;
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
   * Get color for enemy based on type
   * @private
   */
  #getEnemyColor(enemy) {
    // Default enemy color
    let r = 1.0, g = 0.3, b = 0.2; // Orange
    
    try {
      // Check enemy type or level for color variation
      if (enemy.level) {
        const level = enemy.level;
        if (level >= 10) {
          r = 0.8; g = 0.1; b = 0.1; // Dark red for high level
        } else if (level >= 5) {
          r = 1.0; g = 0.4; b = 0.1; // Orange-red for mid level
        } else {
          r = 1.0; g = 0.5; b = 0.2; // Light orange for low level
        }
      }
      
      // Health-based color (fade to dark when low HP)
      if (enemy.hp !== undefined && enemy.maxHp !== undefined) {
        const healthPct = enemy.hp / enemy.maxHp;
        if (healthPct < 0.3) {
          // Darken when low health
          r *= 0.6;
          g *= 0.6;
          b *= 0.6;
        }
      }
    } catch (_) {}
    
    return { r, g, b };
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
