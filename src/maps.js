/**
 * Map Manager
 * - Defines MAP 1..N with unlock requirements and enemy modifiers per map
 * - Persists current map index and unlocked max to localStorage
 * - Provides a simple API to integrate with UI and enemy spawning
 */
import { STORAGE_KEYS } from "../config/index.js";

export function applyMapEnemyCss(modsOrTint) {
  try {
    const doc = typeof document !== "undefined" ? document : null;
    if (!doc || !doc.documentElement || !doc.documentElement.style) return;
    const root = doc.documentElement.style;
    const tint = typeof modsOrTint === "number"
      ? (modsOrTint >>> 0)
      : (modsOrTint && typeof modsOrTint.enemyTint === "number" ? (modsOrTint.enemyTint >>> 0) : 0x4a0e0e);

    const toCss = (n) => {
      const v = (n >>> 0) & 0xffffff;
      return "#" + v.toString(16).padStart(6, "0");
    };
    const darken = (n, f = 0.55) => {
      const r = Math.max(0, Math.min(255, Math.floor(((n >> 16) & 0xff) * f)));
      const g = Math.max(0, Math.min(255, Math.floor(((n >> 8) & 0xff) * f)));
      const b = Math.max(0, Math.min(255, Math.floor((n & 0xff) * f)));
      return ((r << 16) | (g << 8) | b) >>> 0;
    };

    const cssEnemy = toCss(tint);
    const cssEnemyDark = toCss(darken(tint, 0.55));

    root.setProperty("--enemy", cssEnemy);
    root.setProperty("--enemy-dark", cssEnemyDark);
  } catch (_) {}
}

export class MapManager {
  // Static constants
  static ENDLESS = {
    hpGrowthPerDepth: 1.18,
    dmgGrowthPerDepth: 1.16,
    speedGrowthPerDepth: 1.03,
    countGrowthPerDepth: 1.04,
  };

  // Deterministic icon set for maps (emoji). Order matters for stable mapping.
  static MAP_EMOJIS = [
    "🌩️","🌾","⛰️","🏰","⚒️","🌪️","🗺️","🔥","🌊","❄️",
    "🌿","🌀","⚡","☄️","🌋","🏜️","🏞️","🛡️","🧭","🔮",
    "🌫️","⛏️","🌧️","🌥️","🌠"
  ];

  // Definitions: tune per-map enemy tint and multipliers
  static MAPS = [
    {
      index: 1,
      name: "Act I — Fields of Awakening",
      requiredLevel: 1,
      enemyTint: 0xff8080,
      enemyHpMul: 1.0,
      enemyDmgMul: 1.0,
      enemySpeedMul: 1.0,
      enemyCountMul: 1.0,
      desc: "A scorched grove outside the origin village. Fallen scouts and burning beasts swarm the ashen woods.",
      strongEnemies: ["Ravagers (fast melee)", "Embercasters (ranged fire)"],
      imgHint: "Square art: dark forest clearing under a smoke-filled sky; faint ruins; red-tinted foes.",
    },
    {
      index: 2,
      name: "Act II — Volcanic Plains",
      requiredLevel: 5,
      enemyTint: 0xffb060,
      enemyHpMul: 1.35,
      enemyDmgMul: 1.2,
      enemySpeedMul: 1.02,
      enemyCountMul: 1.1,
      desc: "Open grasslands where flames never die. Raiding packs and fire-touched archers roam freely.",
      strongEnemies: ["Flame Hounds (pack hunters)", "Ballistarii (armored archers)"],
      imgHint: "Square art: windswept plains with distant volcanic peaks; orange-tinted foes.",
    },
    {
      index: 3,
      name: "Act III — Inferno Peaks",
      requiredLevel: 10,
      enemyTint: 0xffe070,
      enemyHpMul: 1.8,
      enemyDmgMul: 1.45,
      enemySpeedMul: 1.05,
      enemyCountMul: 1.25,
      desc: "Knife-edged ridgelines where the heat rises like a beast. Altitude and fire converge to test your mettle.",
      strongEnemies: ["Harpy Matrons (dive assaults)", "Fire Shamans (support casters)"],
      imgHint: "Square art: volcanic mountain ridge with lava flows; golden-tinted foes, smoke-filled sky.",
    },
    {
      index: 4,
      name: "Act IV — Sky Citadel",
      requiredLevel: 20,
      enemyTint: 0xa0ffd1,
      enemyHpMul: 2.4,
      enemyDmgMul: 1.8,
      enemySpeedMul: 1.08,
      enemyCountMul: 1.45,
      desc: "A floating bastion crackling with bound sigils. Only the resolute can breach its shining walls.",
      strongEnemies: ["Sentinel Constructs (shielded)", "Zealous Templars (coordinated strikes)"],
      imgHint: "Square art: floating fortress with crackling runes; teal-tinted foes.",
    },
    {
      index: 5,
      name: "Act V — The Godforge",
      requiredLevel: 35,
      enemyTint: 0x9fd8ff,
      enemyHpMul: 3.2,
      enemyDmgMul: 2.3,
      enemySpeedMul: 1.12,
      enemyCountMul: 1.7,
      desc: "An eldritch foundry where power is hammered into being. Sparks of divinity burn those who trespass.",
      strongEnemies: ["Forge Colossus (heavy slam)", "Aether Smiths (channeling blasts)"],
      imgHint: "Square art: colossal heavenly forge, molten channels, pale-blue aura; azure-tinted foes.",
    },
  ];

  constructor() {
    this.currentIndex = this.clampIndex(this.loadInt(STORAGE_KEYS.mapCurrentIndex, 1));
    this.unlockedMax = this.clampIndex(this.loadInt(STORAGE_KEYS.mapUnlockedMax, 1));
  }

  // Helper methods
  clampIndex(i) {
    const idx = Math.max(1, Math.floor(i || 1));
    return idx;
  }

  loadInt(key, def = 1) {
    try {
      const v = parseInt(localStorage.getItem(key) || "", 10);
      return Number.isFinite(v) ? v : def;
    } catch {
      return def;
    }
  }

  saveInt(key, v) {
    try {
      localStorage.setItem(key, String(Math.floor(v)));
    } catch {}
  }

  depthForIndex(i) {
    const idx = this.clampIndex(i);
    return idx > MapManager.MAPS.length ? (idx - MapManager.MAPS.length) : 0;
  }

  // Public API methods
  getCurrentIndex() {
    return this.currentIndex;
  }

  getUnlockedMax() {
    return this.unlockedMax;
  }

  emojiForIndex(i) {
    const idx = this.clampIndex(i);
    return MapManager.MAP_EMOJIS[(idx - 1) % MapManager.MAP_EMOJIS.length];
  }

  listMaps() {
    return MapManager.MAPS.map((m) => ({
      ...m,
      unlocked: m.index <= this.unlockedMax,
      current: m.index === this.currentIndex,
      emoji: this.emojiForIndex(m.index),
    }));
  }

  getCurrent() {
    const cur = MapManager.MAPS.find((m) => m.index === this.currentIndex);
    if (cur) return cur;
    // Synthesize an endless map descriptor
    const depth = this.depthForIndex(this.currentIndex);
    const base = MapManager.MAPS[MapManager.MAPS.length - 1];
    return {
      index: this.currentIndex,
      name: `Endless +${depth}`,
      requiredLevel: base.requiredLevel + depth * 5,
      enemyTint: base.enemyTint,
      enemyHpMul: base.enemyHpMul,
      enemyDmgMul: base.enemyDmgMul,
      desc: `Endless Depth ${depth}. Enemies grow stronger with each depth.`,
      strongEnemies: base.strongEnemies,
      emoji: this.emojiForIndex(this.currentIndex),
      imgHint: base.imgHint,
      _endlessDepth: depth,
    };
  }

  getModifiers() {
    const cur = this.getCurrent();
    const depth = cur._endlessDepth ? cur._endlessDepth : 0;
    const pow = (v, p) => Math.pow(v, Math.max(0, p));
    const enemyHpMul = (cur.enemyHpMul || 1) * pow(MapManager.ENDLESS.hpGrowthPerDepth, depth);
    const enemyDmgMul = (cur.enemyDmgMul || 1) * pow(MapManager.ENDLESS.dmgGrowthPerDepth, depth);
    const enemySpeedMul = pow(MapManager.ENDLESS.speedGrowthPerDepth, depth);
    const enemyCountMul = pow(MapManager.ENDLESS.countGrowthPerDepth, depth);

    // Deterministic enemy color variant per map index (darker on higher maps/endless depth)
    const baseTint = (typeof cur.enemyTint === "number" ? (cur.enemyTint >>> 0) : 0xff6b35) >>> 0;
    // Helpers: int RGB <-> HSL
    const _rgbToHslInt = (n) => {
      let r = ((n >> 16) & 0xff) / 255;
      let g = ((n >> 8) & 0xff) / 255;
      let b = (n & 0xff) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return [h, s, l];
    };
    const _hslToRgbInt = (h, s, l) => {
      let r, g, b;
      if (s === 0) {
        r = g = b = l; // achromatic
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      const ri = Math.max(0, Math.min(255, Math.round(r * 255)));
      const gi = Math.max(0, Math.min(255, Math.round(g * 255)));
      const bi = Math.max(0, Math.min(255, Math.round(b * 255)));
      return ((ri << 16) | (gi << 8) | bi) >>> 0;
    };

    // Darkness factor by act index and endless depth
    // Acts: up to ~25% darker by last defined map; Endless: +4% per depth up to +40%
    const actSpan = Math.max(1, MapManager.MAPS.length - 1);
    const actIdx = Math.max(1, Math.min(this.currentIndex, MapManager.MAPS.length));
    const actDark = actSpan > 0 ? (actIdx - 1) / actSpan * 0.25 : 0.0;
    const depthDark = Math.min(0.4, Math.max(0, depth) * 0.04);
    const darkness = Math.max(0, Math.min(0.65, actDark + depthDark));

    // Small deterministic hue shift per map for variety (wraps every 360/37 maps)
    const hueShift = ((this.currentIndex * 37) % 360) / 360 * 0.02; // up to +0.02

    const [h0, s0, l0] = _rgbToHslInt(baseTint);
    const h = (h0 + hueShift) % 1;
    const s = Math.max(0, Math.min(1, s0 * (0.98 + depth * 0.005))); // slightly boost saturation with depth
    const l = Math.max(0, Math.min(1, l0 * (1 - darkness))); // darken with index/depth

    const enemyTintVar = _hslToRgbInt(h, s, l);

    return {
      enemyTint: enemyTintVar,
      enemyTintBase: baseTint,
      enemyHpMul,
      enemyDmgMul,
      enemySpeedMul,
      enemyCountMul,
      depth,
      name: cur.name,
    };
  }

  canSelect(index) {
    const idx = this.clampIndex(index);
    return idx <= this.unlockedMax;
  }

  setCurrent(index) {
    const idx = this.clampIndex(index);
    if (!this.canSelect(idx)) return false;
    this.currentIndex = idx;
    this.saveInt(STORAGE_KEYS.mapCurrentIndex, this.currentIndex);
    // Apply per-map enemy CSS theme so THEME_COLORS.enemy/enemyDark update live
    try { applyMapEnemyCss(this.getModifiers()); } catch (_) {}
    return true;
  }

  unlockByLevel(heroLevel) {
    // Unlock all defined maps whose requiredLevel is met
    let maxIdx = this.unlockedMax;
    for (const m of MapManager.MAPS) {
      if (heroLevel >= m.requiredLevel) {
        maxIdx = Math.max(maxIdx, m.index);
      }
    }
    // Additionally unlock endless depths gradually (every 5 hero levels adds +1 depth)
    const extraDepth = Math.max(0, Math.floor((heroLevel - (MapManager.MAPS[MapManager.MAPS.length - 1]?.requiredLevel || 1)) / 5));
    const endlessMaxIndex = MapManager.MAPS.length + extraDepth;
    maxIdx = Math.max(maxIdx, endlessMaxIndex);

    if (maxIdx !== this.unlockedMax) {
      this.unlockedMax = maxIdx;
      this.saveInt(STORAGE_KEYS.mapUnlockedMax, this.unlockedMax);
      if (this.currentIndex > this.unlockedMax) {
        this.currentIndex = this.unlockedMax;
        this.saveInt(STORAGE_KEYS.mapCurrentIndex, this.currentIndex);
      }
      return true;
    }
    return false;
  }
}

// Factory function for backward compatibility
export function createMapManager() {
  return new MapManager();
}
