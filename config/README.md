# Config Module Structure

The `config/constants.js` file has been refactored into a modular structure for better organization and maintainability.

## Module Breakdown

### storage.js
**Purpose**: Local storage configuration and keys
- `LOCAL_STORAGE_PREFIX` - Prefix for all local storage keys
- `storageKey()` - Function to generate storage keys
- `STORAGE_KEYS` - Object containing all storage key definitions

### theme.js
**Purpose**: Theme colors and CSS variable management
- `CSS_READY` - Promise that resolves when CSS variables are loaded
- `COLOR` - Dynamic color getters from CSS variables
- `CSS_VAR` - CSS variable references for DOM styling
- `CSS_COLOR` - CSS color values for Canvas2D contexts

### world.js
**Purpose**: World, player, and enemy configuration
- `WORLD` - Game world settings (spawn, combat, AI, chunking)
- `VILLAGE_POS` - Village position vector
- `REST_RADIUS` - Rest area radius
- `HERO_MODEL_URL` - Hero model URL (currently null)

### scaling.js
**Purpose**: Progression and balancing
- `SCALING` - XP growth, hero/enemy stat scaling per level

### stats.js
**Purpose**: Base hero statistics
- `STATS_BASE` - Initial hero HP, MP, regen, and XP requirements

### fx.js
**Purpose**: Visual effects timing and configuration
- `FX` - Global VFX timing controls (timeScale, fade, spin, etc.)

### index.js
**Purpose**: Central re-export point
- Re-exports all constants from all modules
- Provides a single import point for convenience

## Usage

### Option 1: Import from specific modules (recommended for new code)
```javascript
import { STORAGE_KEYS } from "../config/storage.js";
import { COLOR, CSS_VAR } from "../config/theme.js";
import { WORLD } from "../config/world.js";
```

### Option 2: Import from index.js (convenient for multiple imports)
```javascript
import { STORAGE_KEYS, COLOR, WORLD, SCALING } from "../config/index.js";
```

### Option 3: Import from constants.js (backward compatibility)
```javascript
import { STORAGE_KEYS, COLOR, WORLD } from "../config/constants.js";
```

## Backward Compatibility

The original `config/constants.js` file now re-exports all constants from the new modules, ensuring existing code continues to work without modifications. However, for new code, it's recommended to import from the specific modules or from `index.js`.

## Benefits

1. **Better Organization**: Related constants are grouped together
2. **Easier Maintenance**: Smaller, focused files are easier to understand and modify
3. **Improved Tree-shaking**: Bundlers can better optimize unused code
4. **Clear Dependencies**: Each module explicitly imports what it needs
5. **Backward Compatible**: Existing imports continue to work
