// This file is deprecated in favor of the modular structure.
// For backward compatibility, it re-exports all constants from the new modules.
// 
// New code should import directly from:
// - config/storage.js (LOCAL_STORAGE_PREFIX, storageKey, STORAGE_KEYS)
// - config/theme.js (CSS_READY, COLOR, CSS_VAR, CSS_COLOR)
// - config/world.js (WORLD, VILLAGE_POS, REST_RADIUS, HERO_MODEL_URL)
// - config/scaling.js (SCALING)
// - config/stats.js (STATS_BASE)
// - config/fx.js (FX)
//
// Or import everything from config/index.js

export * from "./index.js";
