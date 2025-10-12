/**
 * Device Tier Detection System
 * Classifies devices into tiers based on hardware capabilities
 * to apply appropriate performance optimizations
 */

/**
 * Device tier levels:
 * - HIGH: High-end devices (120 FPS capable, powerful GPU)
 * - MEDIUM: Middle-class devices (60 FPS target, moderate GPU)
 * - LOW: Low-end devices (30 FPS target, weak GPU)
 */
export const DEVICE_TIERS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Detect device tier based on hardware capabilities
 */
export function detectDeviceTier() {
  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Get hardware info
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = navigator.deviceMemory || 2; // GB
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Calculate a performance score
    let score = 0;
    
    // CPU cores factor (0-40 points)
    if (hardwareConcurrency >= 8) score += 40;
    else if (hardwareConcurrency >= 6) score += 30;
    else if (hardwareConcurrency >= 4) score += 20;
    else score += 10;
    
    // Memory factor (0-30 points)
    if (deviceMemory >= 8) score += 30;
    else if (deviceMemory >= 6) score += 25;
    else if (deviceMemory >= 4) score += 20;
    else if (deviceMemory >= 2) score += 10;
    else score += 5;
    
    // Screen resolution factor (0-20 points)
    const totalPixels = screenWidth * screenHeight * pixelRatio;
    if (totalPixels >= 4000000) score += 20; // 4K+ (FIX: was 10)
    else if (totalPixels >= 2000000) score += 15; // FHD+ (FIX: was 20)
    else if (totalPixels >= 1000000) score += 10; // HD+ (FIX: was 15)
    else score += 5; // Low res (FIX: was 10)
    
    // Mobile penalty (0-10 points)
    if (!isMobile) {
      score += 10; // Desktop bonus
    }
    
    // GPU detection via WebGL
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
        
        // High-end GPUs
        if (renderer.includes('nvidia') || renderer.includes('geforce') || 
            renderer.includes('radeon') || renderer.includes('adreno 7') ||
            renderer.includes('mali-g78') || renderer.includes('apple a1') ||
            renderer.includes('apple m')) {
          score += 20;
        }
        // Mid-range GPUs
        else if (renderer.includes('adreno 6') || renderer.includes('mali-g7') ||
                 renderer.includes('apple a9') || renderer.includes('apple a10') ||
                 renderer.includes('apple a11') || renderer.includes('apple a12')) {
          score += 10;
        }
        // Low-end GPUs get no bonus
      }
      
      // Check max texture size as GPU capability indicator
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (maxTextureSize >= 8192) score += 10;
      else if (maxTextureSize >= 4096) score += 5;
    }
    
    // Determine tier based on score
    let tier;
    if (score >= 80) {
      tier = DEVICE_TIERS.HIGH;
    } else if (score >= 50) {
      tier = DEVICE_TIERS.MEDIUM;
    } else {
      tier = DEVICE_TIERS.LOW;
    }
    
    // Get GPU info for logging
    let gpuInfo = 'no-webgl';
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      gpuInfo = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
    }
    
    console.info(`[DeviceTier] Detection Results:`, {
      tier,
      score,
      breakdown: {
        cpu: `${hardwareConcurrency} cores`,
        memory: `${deviceMemory} GB`,
        screen: `${screenWidth}x${screenHeight} (${totalPixels.toLocaleString()} pixels)`,
        pixelRatio,
        isMobile,
        gpu: gpuInfo
      },
      thresholds: {
        HIGH: '≥80 points',
        MEDIUM: '50-79 points', 
        LOW: '<50 points'
      }
    });
    
    return tier;
  } catch (error) {
    console.warn('[DeviceTier] Detection failed, defaulting to MEDIUM', error);
    return DEVICE_TIERS.MEDIUM;
  }
}

/**
 * Get optimization settings based on device tier
 */
export function getTierOptimizations(tier) {
  console.info(`[DeviceTier] Getting optimizations for tier: ${tier}`);
  switch (tier) {
    case DEVICE_TIERS.HIGH:
      return {
        // Mesh detail
        meshQuality: 1.0,           // Full detail
        segmentMultiplier: 1.0,     // Full segments
        
        // Rendering
        maxPixelRatio: 2.0,
        shadowsEnabled: true,
        shadowMapSize: 2048,
        
        // Performance
        maxEnemies: 1.0,            // 100% enemies
        vfxDistanceCull: 140,
        aiStrideMultiplier: 1,
        frameBudgetMs: 8.0,
        
        // Materials
        useMeshStandard: true,
        materialComplexity: 'high',
        
        // LOD distances
        lodDistances: [30, 60, 100],
        
        // Culling
        frustumCulling: true,
        occlusionCulling: false,
        maxDrawDistance: 200,
      };
      
    case DEVICE_TIERS.MEDIUM:
      return {
        // Mesh detail - REDUCED
        meshQuality: 0.5,           // 50% detail
        segmentMultiplier: 0.5,     // Half the segments
        
        // Rendering
        maxPixelRatio: 1.5,
        shadowsEnabled: false,      // Disable shadows
        shadowMapSize: 1024,
        
        // Performance
        maxEnemies: 0.5,            // 50% enemies
        vfxDistanceCull: 80,
        aiStrideMultiplier: 2,
        frameBudgetMs: 12.0,
        
        // Materials
        useMeshStandard: false,     // Use Lambert instead
        materialComplexity: 'medium',
        
        // LOD distances - more aggressive
        lodDistances: [20, 40, 70],
        
        // Culling
        frustumCulling: true,
        occlusionCulling: false,
        maxDrawDistance: 120,
        
        // Instancing
        useInstancing: true,        // Enable geometry instancing
        batchDrawCalls: true,       // Merge geometries
      };
      
    case DEVICE_TIERS.LOW:
      return {
        // Mesh detail - MINIMAL
        meshQuality: 0.3,           // 30% detail
        segmentMultiplier: 0.3,     // Minimal segments
        
        // Rendering
        maxPixelRatio: 1.0,
        shadowsEnabled: false,
        shadowMapSize: 512,
        
        // Performance
        maxEnemies: 0.3,            // 30% enemies
        vfxDistanceCull: 50,
        aiStrideMultiplier: 3,
        frameBudgetMs: 16.0,
        
        // Materials
        useMeshStandard: false,
        materialComplexity: 'low',
        
        // LOD distances - very aggressive
        lodDistances: [15, 30, 50],
        
        // Culling
        frustumCulling: true,
        occlusionCulling: false,
        maxDrawDistance: 80,
        
        // Instancing
        useInstancing: true,
        batchDrawCalls: true,
        simplifyGeometry: true,     // Use box/sphere approximations
      };
      
    default:
      return getTierOptimizations(DEVICE_TIERS.MEDIUM);
  }
}

/**
 * Cached device tier
 */
let cachedTier = null;

/**
 * Get current device tier (cached)
 */
export function getDeviceTier() {
  if (!cachedTier) {
    cachedTier = detectDeviceTier();
  }
  return cachedTier;
}

/**
 * Get current tier optimizations (cached)
 */
export function getCurrentTierOptimizations() {
  return getTierOptimizations(getDeviceTier());
}
