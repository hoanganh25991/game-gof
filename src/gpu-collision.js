/**
 * GPU Collision Detection System
 * Phase 3 Optimization: Offload collision detection to GPU
 * 
 * Uses collision textures and GPU shaders to check collisions in parallel
 * instead of sequential CPU calculations.
 */

export class GPUCollisionSystem {
  #THREE;
  #scene;
  #renderer;
  #worldSize;
  #textureSize;
  #collisionTexture;
  #collisionData;
  #isWebGL2;

  constructor({ THREE, scene, renderer, worldSize = 500, textureSize = 512 }) {
    this.#THREE = THREE;
    this.#scene = scene;
    this.#renderer = renderer;
    this.#worldSize = worldSize;
    this.#textureSize = textureSize;
    
    // Check WebGL2 support
    const gl = renderer.getContext();
    this.#isWebGL2 = gl instanceof WebGL2RenderingContext;
    
    if (!this.#isWebGL2) {
      console.warn('[GPUCollision] WebGL2 not available. GPU collision disabled.');
      return;
    }
    
    // Initialize collision texture
    this.#initCollisionTexture();
  }

  /**
   * Initialize collision texture
   * Creates a texture where 0 = free space, 1 = obstacle
   * @private
   */
  #initCollisionTexture() {
    const size = this.#textureSize;
    const data = new Uint8Array(size * size);
    
    // Initialize with all free space
    data.fill(0);
    
    this.#collisionData = data;
    this.#collisionTexture = new this.#THREE.DataTexture(
      data,
      size,
      size,
      this.#THREE.RedFormat,
      this.#THREE.UnsignedByteType
    );
    
    this.#collisionTexture.needsUpdate = true;
    this.#collisionTexture.minFilter = this.#THREE.NearestFilter;
    this.#collisionTexture.magFilter = this.#THREE.NearestFilter;
  }

  /**
   * Bake obstacles into collision texture
   * @param {Object} options - Baking options
   * @param {Object} options.villages - Villages data
   * @param {Object} options.structures - Structures data
   * @param {Object} options.villagePos - Origin village position
   * @param {number} options.restRadius - Rest radius
   */
  bakeCollisionMap({ villages, structures, villagePos, restRadius }) {
    if (!this.#isWebGL2) return;
    
    const size = this.#textureSize;
    const data = this.#collisionData;
    const worldSize = this.#worldSize;
    const scale = size / worldSize;
    
    // Clear previous data
    data.fill(0);
    
    // Bake origin village
    if (villagePos && restRadius) {
      this.#bakeCircle(data, size, villagePos, restRadius, scale);
    }
    
    // Bake discovered villages
    try {
      const villageList = villages?.listVillages?.() || [];
      for (const v of villageList) {
        const radius = v.radius || restRadius;
        this.#bakeCircle(data, size, v.center, radius, scale);
      }
    } catch (_) {}
    
    // Bake structures
    try {
      if (structures && Array.isArray(structures)) {
        for (const s of structures) {
          const radius = s.protectionRadius || 8;
          this.#bakeCircle(data, size, s.position, radius, scale);
        }
      }
    } catch (_) {}
    
    // Update texture
    this.#collisionTexture.needsUpdate = true;
  }

  /**
   * Bake a circular obstacle into the collision texture
   * @private
   */
  #bakeCircle(data, size, center, radius, scale) {
    const worldSize = this.#worldSize;
    const halfWorld = worldSize / 2;
    
    // Convert world position to texture coordinates
    const cx = Math.floor((center.x + halfWorld) * scale);
    const cz = Math.floor((center.z + halfWorld) * scale);
    const r = Math.ceil(radius * scale);
    
    // Draw filled circle
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= r) {
          const x = cx + dx;
          const z = cz + dy;
          if (x >= 0 && x < size && z >= 0 && z < size) {
            const idx = z * size + x;
            data[idx] = 255; // Mark as obstacle
          }
        }
      }
    }
  }

  /**
   * Check if a world position is blocked
   * @param {THREE.Vector3} position - World position to check
   * @returns {boolean} True if position is blocked
   */
  isBlocked(position) {
    if (!this.#isWebGL2) return false;
    
    const size = this.#textureSize;
    const worldSize = this.#worldSize;
    const halfWorld = worldSize / 2;
    const scale = size / worldSize;
    
    // Convert world position to texture coordinates
    const x = Math.floor((position.x + halfWorld) * scale);
    const z = Math.floor((position.z + halfWorld) * scale);
    
    // Check bounds
    if (x < 0 || x >= size || z < 0 || z >= size) {
      return true; // Out of bounds = blocked
    }
    
    // Check texture
    const idx = z * size + x;
    return this.#collisionData[idx] > 127; // Blocked if value > 127
  }

  /**
   * Get collision texture for use in shaders
   * @returns {THREE.DataTexture|null}
   */
  getCollisionTexture() {
    return this.#collisionTexture;
  }

  /**
   * Get shader uniforms for collision checking
   * @returns {Object}
   */
  getShaderUniforms() {
    if (!this.#isWebGL2) return {};
    
    return {
      collisionMap: { value: this.#collisionTexture },
      worldSize: { value: this.#worldSize },
      textureSize: { value: this.#textureSize }
    };
  }

  /**
   * Get shader code for collision checking
   * Can be included in custom shaders
   * @returns {string}
   */
  getShaderCode() {
    return `
      uniform sampler2D collisionMap;
      uniform float worldSize;
      uniform float textureSize;
      
      bool isPositionBlocked(vec3 position) {
        vec2 uv = (position.xz + worldSize * 0.5) / worldSize;
        uv = clamp(uv, 0.0, 1.0);
        float collision = texture2D(collisionMap, uv).r;
        return collision > 0.5;
      }
      
      vec3 constrainToFreeSpace(vec3 currentPos, vec3 newPos) {
        if (isPositionBlocked(newPos)) {
          return currentPos; // Stay at current position if new position blocked
        }
        return newPos;
      }
    `;
  }

  /**
   * Check if GPU collision is supported
   * @returns {boolean}
   */
  isSupported() {
    return this.#isWebGL2;
  }

  /**
   * Get statistics for debugging
   * @returns {Object}
   */
  getStats() {
    if (!this.#isWebGL2) {
      return {
        supported: false,
        textureSize: 0,
        blockedPixels: 0,
        percentBlocked: 0
      };
    }
    
    const data = this.#collisionData;
    let blockedCount = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > 127) blockedCount++;
    }
    
    return {
      supported: true,
      textureSize: this.#textureSize,
      worldSize: this.#worldSize,
      blockedPixels: blockedCount,
      totalPixels: data.length,
      percentBlocked: (blockedCount / data.length) * 100
    };
  }

  /**
   * Update collision map (call when villages/structures change)
   */
  update(options) {
    this.bakeCollisionMap(options);
  }

  /**
   * Dispose resources
   */
  dispose() {
    if (this.#collisionTexture) {
      this.#collisionTexture.dispose();
    }
  }
}
