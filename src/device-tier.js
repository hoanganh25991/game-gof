/**
 * Device Tier System
 * Uses player-selected render quality from settings to apply
 * appropriate performance optimizations
 */

/**
 * Device tier levels (matches render quality settings):
 * - HIGH: High quality rendering
 * - MEDIUM: Medium quality rendering  
 * - LOW: Low quality rendering
 */
export const DEVICE_TIERS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Get device tier from localStorage render quality setting
 * @param {string} storageKeyPrefix - The storage key prefix (e.g., 'gof_')
 * @returns {string} Device tier based on user's render quality preference
 */
function getDeviceTierFromSettings(storageKeyPrefix = 'gof_') {
  try {
    const renderPrefsKey = `${storageKeyPrefix}renderPrefs`;
    const stored = localStorage.getItem(renderPrefsKey);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      const quality = parsed.quality;
      
      // Map render quality to device tier
      if (quality === 'high') return DEVICE_TIERS.HIGH;
      if (quality === 'low') return DEVICE_TIERS.LOW;
      return DEVICE_TIERS.MEDIUM; // Default to medium
    }
  } catch (error) {
    console.warn('[DeviceTier] Failed to read settings, defaulting to MEDIUM', error);
  }
  
  // Default to medium if no settings found
  return DEVICE_TIERS.MEDIUM;
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
 * Get current device tier from user settings
 * @param {string} storageKeyPrefix - Optional storage key prefix
 * @returns {string} Current device tier
 */
export function getDeviceTier(storageKeyPrefix) {
  return getDeviceTierFromSettings(storageKeyPrefix);
}

/**
 * Get current tier optimizations based on user settings
 * @param {string} storageKeyPrefix - Optional storage key prefix
 * @returns {object} Optimization settings for current tier
 */
export function getCurrentTierOptimizations(storageKeyPrefix) {
  const tier = getDeviceTier(storageKeyPrefix);
  console.info(`[DeviceTier] Applying optimizations for user-selected tier: ${tier}`);
  return getTierOptimizations(tier);
}
