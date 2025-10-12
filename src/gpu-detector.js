/**
 * GPU Detection and Capability Analysis
 * Detects GPU capabilities, provides warnings for weak GPUs,
 * and tracks GPU utilization metrics
 */

export class GPUDetector {
  constructor() {
    this.capabilities = null;
    this.warnings = [];
  }

  /**
   * Detect GPU capabilities
   * @returns {Object} GPU capabilities and metrics
   */
  detect() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      this.warnings.push({
        level: 'critical',
        message: 'WebGL not supported. GPU acceleration unavailable.'
      });
      return this.capabilities = {
        supported: false,
        webgl2: false,
        renderer: 'none',
        vendor: 'none'
      };
    }

    // Get WebGL version
    const isWebGL2 = gl instanceof WebGL2RenderingContext;
    
    // Get GPU info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
    
    // Get capabilities
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    const maxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS);
    const maxFragmentUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    const maxVertexUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
    
    // Check for important extensions
    const extensions = {
      anisotropic: !!(gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')),
      instancedArrays: !!gl.getExtension('ANGLE_instanced_arrays'),
      vertexArrayObject: !!gl.getExtension('OES_vertex_array_object'),
      floatTextures: !!gl.getExtension('OES_texture_float'),
      depthTexture: !!gl.getExtension('WEBGL_depth_texture'),
      drawBuffers: !!gl.getExtension('WEBGL_draw_buffers')
    };

    // Detect GPU tier
    const gpuTier = this._detectGPUTier(renderer.toLowerCase());
    
    // Check for warnings
    this._analyzeCapabilities(isWebGL2, gpuTier, maxTextureSize, extensions);

    this.capabilities = {
      supported: true,
      webgl2: isWebGL2,
      renderer,
      vendor,
      tier: gpuTier,
      maxTextureSize,
      maxVertexAttribs,
      maxVaryingVectors,
      maxFragmentUniforms,
      maxVertexUniforms,
      extensions,
      // GPU memory estimation (not directly available, estimated from context)
      estimatedMemoryMB: this._estimateGPUMemory(gl)
    };

    console.info('[GPUDetector] Capabilities:', this.capabilities);
    if (this.warnings.length > 0) {
      console.warn('[GPUDetector] Warnings:', this.warnings);
    }

    return this.capabilities;
  }

  /**
   * Detect GPU tier based on renderer string
   * @private
   */
  _detectGPUTier(renderer) {
    // High-end desktop GPUs
    if (
      renderer.includes('nvidia') && (renderer.includes('rtx') || renderer.includes('gtx 1')) ||
      renderer.includes('radeon') && (renderer.includes('rx 6') || renderer.includes('rx 7')) ||
      renderer.includes('apple m1') || renderer.includes('apple m2') || renderer.includes('apple m3')
    ) {
      return 'high';
    }

    // High-end mobile GPUs
    if (
      renderer.includes('adreno 7') || renderer.includes('adreno 6') ||
      renderer.includes('mali-g78') || renderer.includes('mali-g77') ||
      renderer.includes('apple a14') || renderer.includes('apple a15') || 
      renderer.includes('apple a16') || renderer.includes('apple a17')
    ) {
      return 'high';
    }

    // Mid-range GPUs
    if (
      renderer.includes('adreno 5') || renderer.includes('adreno 6') ||
      renderer.includes('mali-g') ||
      renderer.includes('apple a11') || renderer.includes('apple a12') || renderer.includes('apple a13') ||
      renderer.includes('intel') && (renderer.includes('iris') || renderer.includes('uhd'))
    ) {
      return 'medium';
    }

    // Low-end GPUs
    return 'low';
  }

  /**
   * Estimate GPU memory
   * @private
   */
  _estimateGPUMemory(gl) {
    // Try to get GPU memory info (Chrome only)
    if (gl.getExtension('WEBGL_debug_renderer_info')) {
      const info = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);
      // Parse memory from renderer string if available (e.g., "NVIDIA GeForce RTX 3060 (8GB)")
      const memMatch = info.match(/(\d+)\s*GB/i);
      if (memMatch) {
        return parseInt(memMatch[1]) * 1024; // Convert to MB
      }
    }

    // Fallback: estimate based on device type and tier
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const tier = this.capabilities?.tier || 'low';

    if (isMobile) {
      return tier === 'high' ? 4096 : tier === 'medium' ? 2048 : 1024;
    } else {
      return tier === 'high' ? 8192 : tier === 'medium' ? 4096 : 2048;
    }
  }

  /**
   * Analyze capabilities and generate warnings
   * @private
   */
  _analyzeCapabilities(isWebGL2, gpuTier, maxTextureSize, extensions) {
    // Critical: No WebGL2
    if (!isWebGL2) {
      this.warnings.push({
        level: 'warning',
        message: 'WebGL2 not available. Some GPU acceleration features disabled.',
        suggestion: 'Update your browser or use a modern device for better performance.'
      });
    }

    // Warning: Low-end GPU
    if (gpuTier === 'low') {
      this.warnings.push({
        level: 'warning',
        message: 'Weak GPU detected. Performance may be limited.',
        suggestion: 'Consider reducing quality settings in Graphics menu.'
      });
    }

    // Warning: Small texture size
    if (maxTextureSize < 4096) {
      this.warnings.push({
        level: 'info',
        message: 'Limited texture size support.',
        suggestion: 'High-resolution textures will be downscaled.'
      });
    }

    // Warning: Missing important extensions
    if (!extensions.instancedArrays) {
      this.warnings.push({
        level: 'warning',
        message: 'GPU instancing not supported.',
        suggestion: 'Performance will be reduced for large numbers of objects.'
      });
    }
  }

  /**
   * Get GPU utilization estimate
   * Note: Real GPU utilization not available in WebGL
   * This estimates based on frame time
   */
  getGPUUtilization(frameTimeMs) {
    if (!this.capabilities || !this.capabilities.supported) {
      return { usage: 0, estimated: false };
    }

    // Estimate GPU usage based on frame time
    // This is an approximation since true GPU usage isn't accessible
    const targetFrameTime = 16.67; // 60 FPS target
    const gpuEstimate = Math.min(100, (frameTimeMs / targetFrameTime) * 100);

    return {
      usage: gpuEstimate,
      estimated: true,
      note: 'GPU usage is estimated (browser security limits prevent direct measurement)'
    };
  }

  /**
   * Get all warnings
   */
  getWarnings() {
    return this.warnings;
  }

  /**
   * Get capabilities
   */
  getCapabilities() {
    return this.capabilities;
  }

  /**
   * Check if GPU is suitable for game
   */
  isSuitable() {
    if (!this.capabilities) {
      this.detect();
    }

    return this.capabilities.supported && 
           this.capabilities.tier !== 'low' &&
           this.capabilities.maxTextureSize >= 2048;
  }

  /**
   * Get recommendation based on GPU
   */
  getRecommendation() {
    if (!this.capabilities) {
      this.detect();
    }

    const tier = this.capabilities.tier;
    const isWebGL2 = this.capabilities.webgl2;

    if (!this.capabilities.supported) {
      return {
        quality: 'low',
        message: 'GPU acceleration unavailable. Expect poor performance.',
        enableEffects: false,
        maxEnemies: 10
      };
    }

    if (tier === 'low' || !isWebGL2) {
      return {
        quality: 'low',
        message: 'Weak GPU detected. Use LOW quality settings.',
        enableEffects: false,
        maxEnemies: 20
      };
    }

    if (tier === 'medium') {
      return {
        quality: 'medium',
        message: 'Moderate GPU. MEDIUM quality recommended.',
        enableEffects: true,
        maxEnemies: 50
      };
    }

    return {
      quality: 'high',
      message: 'Powerful GPU detected. HIGH quality available.',
      enableEffects: true,
      maxEnemies: 100
    };
  }
}

// Singleton instance
export const gpuDetector = new GPUDetector();
