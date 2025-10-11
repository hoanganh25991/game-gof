// Platform and performance configuration for mobile devices
import { getDeviceTier, getCurrentTierOptimizations, DEVICE_TIERS } from './device-tier.js';

// Detect mobile/touch devices conservatively
export const isMobile = (() => {
  try {
    const hasTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth <= 1024;
    return hasTouchScreen && (mobileUA || isSmallScreen);
  } catch (_) {
    return false;
  }
})();

// Get device tier and optimizations
const deviceTier = getDeviceTier();
const tierOpts = getCurrentTierOptimizations();

console.info(`[Mobile] Device tier: ${deviceTier}`);

// Mobile-specific performance settings based on device tier
export const MOBILE_OPTIMIZATIONS = {
  maxPixelRatio: tierOpts.maxPixelRatio,
  enemyCountMultiplier: tierOpts.maxEnemies,
  vfxDistanceCull: tierOpts.vfxDistanceCull,
  hudUpdateMs: deviceTier === DEVICE_TIERS.LOW ? 300 : 200,
  minimapUpdateMs: deviceTier === DEVICE_TIERS.LOW ? 400 : 300,
  aiStrideMultiplier: tierOpts.aiStrideMultiplier,
  frameBudgetMs: tierOpts.frameBudgetMs,
  envDensityReduction: 1.0 - tierOpts.meshQuality,
  disableShadows: !tierOpts.shadowsEnabled,
  reduceDrawCalls: tierOpts.batchDrawCalls || false,
  cullDistance: tierOpts.maxDrawDistance || 100,
  skipSlowUpdates: deviceTier === DEVICE_TIERS.LOW,
  simplifyMaterials: !tierOpts.useMeshStandard,
  disableRain: deviceTier === DEVICE_TIERS.LOW,
  
  // Additional tier-specific optimizations
  deviceTier: deviceTier,
  meshQuality: tierOpts.meshQuality,
  segmentMultiplier: tierOpts.segmentMultiplier,
};

/**
 * Apply mobile GPU/CPU optimizations on renderer where applicable.
 * Safe to call on desktop; it will be a no-op except logging.
 */
export function applyMobileRendererHints(renderer, { quality }) {
  if (!isMobile || !renderer || quality == "high") return;
  try {
    console.log("[Mobile] Apply renderer hints", { quality })
    const currentRatio = renderer.getPixelRatio();
    const maxRatio = MOBILE_OPTIMIZATIONS.maxPixelRatio;
    if (currentRatio > maxRatio) {
      renderer.setPixelRatio(Math.min(currentRatio, maxRatio));
      console.info(`[Mobile] Capped pixel ratio: ${currentRatio.toFixed(2)} -> ${maxRatio}`);
    }
    if (MOBILE_OPTIMIZATIONS.disableShadows) {
      renderer.shadowMap.enabled = false;
      console.info('[Mobile] Disabled shadows for performance');
    }
    try {
      const gl = renderer.getContext();
      if (gl) {
        // Context already created, log preference if needed
        console.info('[Mobile] GPU power preference: high-performance');
      }
    } catch (_) { }
  } catch (_) { }
}

/**
 * Utility to expose commonly tuned values for UI/debug.
 * This keeps a single source-of-truth for mobile tuning knobs.
 */
export function getMobileTuning() {
  return { ...MOBILE_OPTIMIZATIONS };
}
