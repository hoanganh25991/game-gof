# Deep Refactoring Plan - Game Architecture

## Problem Analysis
The current `main.js` is ~1000+ lines with mixed responsibilities:
- World/Scene initialization
- Player/Enemy management
- Skills/Combat systems
- UI management
- Settings persistence
- Buff management
- Proximity detection
- Input handling
- Animation loop
- Performance tracking

## New Architecture

### Core Classes Structure

```
src/
├── core/
│   ├── GameEngine.js          // Main orchestrator (singleton)
│   ├── WorldManager.js         // Scene, camera, renderer management
│   ├── GameLoop.js             // Animation loop coordination
│   └── InitializationManager.js // Startup sequence
├── managers/
│   ├── BuffManager.js          // All buff logic (villa, temple, village)
│   ├── ProximityManager.js     // Proximity detection & messages
│   ├── SettingsManager.js      // Settings persistence & UI
│   ├── UIController.js         // UI coordination
│   └── SpawnManager.js         // Enemy spawning (refactor spawn.js)
├── systems/ (already refactored)
│   ├── CameraSystem.js ✓
│   ├── PlayerSystem.js ✓
│   ├── EnemiesSystem.js ✓
│   ├── RespawnSystem.js
│   └── VillagesSystem.js
└── main.js                     // Minimal bootstrap
```

## Implementation Phases

### Phase 1: Core Infrastructure (Priority 1)
- [x] CameraSystem class
- [x] PlayerSystem class  
- [x] EnemiesSystem class
- [ ] WorldManager class
- [ ] GameLoop class
- [ ] InitializationManager class

### Phase 2: Managers (Priority 2)
- [ ] BuffManager class
- [ ] ProximityManager class
- [ ] SettingsManager class
- [ ] UIController class
- [ ] SpawnManager class (refactor spawn.js)

### Phase 3: Game Engine (Priority 3)
- [ ] GameEngine class (singleton orchestrator)
- [ ] Minimal main.js bootstrap

### Phase 4: Additional Systems (Priority 4)
- [ ] RespawnSystem class enhancement
- [ ] VillagesSystem class (refactor villages.js)
- [ ] SkillsSystem class enhancement
- [ ] EffectsManager class enhancement

## Class Responsibilities

### GameEngine (Singleton)
- Owns all managers and systems
- Coordinates initialization
- Provides centralized access to game state
- Manages game lifecycle

### WorldManager
- Three.js scene management
- Renderer configuration
- Camera setup
- Ground/grid management
- Environment coordination

### BuffManager
- Villa regen buff logic
- Temple buff system (damage/speed/defense)
- Village regen buff
- Buff indicators (emoji sprites)
- Buff state management

### ProximityManager
- Structure proximity detection
- Message cooldown management
- Structure-specific messages
- Integration with BuffManager

### SettingsManager
- Audio settings (music/sfx)
- Render quality
- Environment density/rain
- Language selection
- Persistence layer

### UIController
- HUD updates (throttled)
- Minimap updates (throttled)
- Center message display
- Settings panel
- Hero screen
- Top bar coordination

### GameLoop
- Animation loop
- Delta time calculation
- System update coordination
- Performance budgeting
- Frame skip logic

## Migration Strategy

1. **No Breaking Changes**: Keep factory functions for backward compat
2. **Incremental**: Refactor one class at a time
3. **Test Each Step**: Verify game still works after each class
4. **Gradual Migration**: main.js shrinks as classes take over

## Benefits

1. **Clear Boundaries**: Each class has single responsibility
2. **Testability**: Easy to unit test individual managers
3. **Maintainability**: Code organized by feature/concern
4. **Extensibility**: Easy to add new features
5. **Type Safety**: Better IDE support with classes
6. **Performance**: Easier to optimize individual systems
7. **Debugging**: Clear ownership of functionality

## Current Status

- ✓ Phase 1: Core systems refactored (Camera, Player, Enemies)
- → Next: WorldManager, GameLoop, BuffManager
