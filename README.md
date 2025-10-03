# GoF RPG (Three.js Top‑Down Action/RTS‑like Prototype)

A lightweight prototype featuring DOTA‑style controls, electric abilities, simple AI, HUD/minimap, portals/recall, and a village regen zone — implemented as modular ES modules with Three.js.

## Overview

**Game Play**
![guide](./images/gof-guide.jpeg)

**First Person**
![guide](./images/gof-first-person.jpeg)

**Skills**
![guide](./images/gof-skills.jpeg)

**Guide**
![guide](./images/gof-guide.jpeg)

**Settings**
![guide](./images/gof-settings.jpeg)

**Maps**
![guide](./images/gof-maps.jpeg)

### Demo

[demo.mp4](demo.mp4)

## Google Play

https://play.google.com/store/apps/details?id=io.github.hoanganh25991.gof

## Quick Start

This project is static (no build step). Serve the root directory with any static file server to enable ES module imports.

Examples:
- Python 3: `python3 -m http.server 8000`
- Node: `npx http-server -p 8000`

Then open:
- http://localhost:8000 (or the port you chose)

## Gameplay Overview

- Player (GoF) moves with RTS‑style orders and auto‑attacks when in range.
- Enemies aggro, chase, attack, or wander when idle.
- Four skills with cooldowns and mana:
  - Q Chain Lightning (chains targets in range)
  - W Lightning AOE (damages + applies slow)
  - E Static Field Aura (periodic ticks, drains mana)
  - R Thunderstorm (random strikes over time)
- HUD shows HP/MP/XP/Level; cooldown wedges display time remaining.
- Minimap shows player, enemies, village ring, and portals.
- Recall (B) spawns a return portal; click it to travel to the village; regen is boosted in the village ring.
- On death, auto‑respawn in the village after a short delay.

## Credits

Developed with passion by the Monk Journey team.

## License

Copyright © 2025 Monk Journey Team. All Rights Reserved.

This project is proprietary and confidential. Unauthorized reproduction, distribution, or disclosure is prohibited. No license, express or implied, to any intellectual property rights is granted by this document.

See the [LICENSE](LICENSE) file for full details.
