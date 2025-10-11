// Utilities to resolve theme colors from css/base.css variables at runtime
const __styleCache = { computed: null };

function getRootComputedStyle() {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (!__styleCache.computed) {
    __styleCache.computed = getComputedStyle(document.documentElement);
  }
  return __styleCache.computed;
}

function readCssVar(varName) {
  const cs = getRootComputedStyle();
  if (!cs) return "";
  return cs.getPropertyValue(varName)?.trim() || "";
}

/**
 * CSS readiness: resolves when base.css :root variables are available.
 * No fallbacks; we simply delay until computed styles contain our keys.
 * Dispatches a 'css-vars-ready' event on window when ready.
 */
export const CSS_READY = (() => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(true);
  }
  const keys = ["--theme-orange", "--system-text", "--glass"];
  const hasVars = () => {
    try {
      const cs = getComputedStyle(document.documentElement);
      return keys.every((k) => (cs.getPropertyValue(k) || "").trim().length > 0);
    } catch (_) { return false; }
  };
  if (hasVars()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let rafId = 0;
    const check = () => {
      if (hasVars()) {
        // Bust cached computed style so subsequent reads see final values
        try { __styleCache.computed = null; } catch (_) {}
        try { window.dispatchEvent(new Event("css-vars-ready")); } catch (_) {}
        if (rafId) cancelAnimationFrame(rafId);
        resolve(true);
        return;
      }
      rafId = requestAnimationFrame(check);
    };
    try { window.addEventListener("load", check, { once: true }); } catch (_) {}
    check();
  });
})();

export const COLOR = {
  // Values resolve from css/base.css :root at runtime with fallbacks to previous literals
  get fire() { return readCssVar("--theme-orange"); },          // primary fire orange
  get darkFire() { return readCssVar("--dark-orange"); },       // deep dark
  get midFire() { return readCssVar("--theme-light-orange"); }, // lighter orange
  get white() { return readCssVar("--white"); },                // warm text white
  get hp() { return readCssVar("--hp"); },                      // HP red
  get mp() { return readCssVar("--mp"); },                      // MP blue (fallback: dark orange)
  get xp() { return readCssVar("--xp"); },                      // XP gold/orange
  // Extended theme tokens (from css/base.css)
  get accent() { return readCssVar("--theme-accent"); },
  get yellow() { return readCssVar("--theme-yellow"); },
  get themeDark() { return readCssVar("--theme-dark"); },
  get textWarm() { return readCssVar("--text-warm"); },
  get textWarmLight() { return readCssVar("--text-warm-light"); },

  // Enemy color tokens resolved from css/base.css (string values like "#RRGGBB")
  get enemy() { return readCssVar("--enemy"); },
  get enemyDark() { return readCssVar("--enemy-dark"); },

  // Extra color tokens resolved from CSS_COLOR (string values suitable for Canvas/CSS)
  get portal() { return CSS_COLOR.portal; },
  get village() { return CSS_COLOR.village; },
  get lava() { return CSS_COLOR.lava; },
  get ember() { return CSS_COLOR.ember; },
  get ash() { return CSS_COLOR.ash; },
  get volcano() { return CSS_COLOR.volcano; },
};

// CSS variable references for DOM styling (preferred for live theming)
export const CSS_VAR = {
  themeDark: "var(--theme-dark)",
  themeOrange: "var(--theme-orange)",
  themeLightOrange: "var(--theme-light-orange)",
  themeWhite: "var(--theme-white)",
  themeAccent: "var(--theme-accent)",
  themeYellow: "var(--theme-yellow)",
  white: "var(--white)",
  accent: "var(--accent)",
  // System UI
  systemBg: "var(--system-bg)",
  systemBorder: "var(--system-border)",
  systemText: "var(--system-text)",
  systemAccent: "var(--system-accent)",
  // Common borders / glass
  borderOrange: "var(--border-orange)",
  borderOrangeLight: "var(--border-orange-light)",
  borderOrangeSubtle: "var(--border-orange-subtle)",
  borderWhiteSubtle: "var(--border-white-subtle)",
  borderWhiteFaint: "var(--border-white-faint)",
  glass: "var(--glass)",
  glassStrong: "var(--glass-strong)",
  textWarm: "var(--text-warm)",
  textWarmLight: "var(--text-warm-light)",
  shadowMedium: "var(--shadow-medium)",
  shadowStrong: "var(--shadow-strong)",
  glowOrange: "var(--glow-orange)",
  glowOrangeStrong: "var(--glow-orange-strong)",
};

/**
 * CSS color values intended for non-CSS contexts (e.g., Canvas2D), resolved dynamically
 * from css/base.css at runtime when possible. Falls back to literals if unavailable.
 */
export const CSS_COLOR = {
  // Mirrors css/base.css tokens (resolved at runtime with fallbacks)
  get glass() { return readCssVar("--glass"); },
  get glassStrong() { return readCssVar("--glass-strong"); },
  get borderOrange() { return readCssVar("--border-orange"); },
  get borderOrangeLight() { return readCssVar("--border-orange-light"); },
  get borderOrangeSubtle() { return readCssVar("--border-orange-subtle"); },
  get borderWhiteSubtle() { return readCssVar("--border-white-subtle"); },
  get borderWhiteFaint() { return readCssVar("--border-white-faint"); },

  // Useful UI colors promoted to CSS variables (resolved dynamically with fallbacks)
  get roadUnderlay() { return readCssVar("--road-underlay"); },
  get roadDark() { return readCssVar("--road-dark"); },
  get villageRing() { return readCssVar("--village-ring"); },
  get villageRingFaint() { return readCssVar("--village-ring-faint"); },
  get portal() { return readCssVar("--portal"); },
  get portalAlt() { return readCssVar("--portal-alt"); },
  get enemyDot() { return readCssVar("--enemy-dot"); },
  get yellowGlowStrong() { return readCssVar("--yellow-glow-strong"); },
  get playerDot() { return readCssVar("--player-dot"); },

  // Structure minimap colors
  get templeDot() { return readCssVar("--temple-dot"); },
  get villaDot() { return readCssVar("--villa-dot"); },
  get columnDot() { return readCssVar("--column-dot"); },
  get statueDot() { return readCssVar("--statue-dot"); },
  get obeliskDot() { return readCssVar("--obelisk-dot"); },

  // Skill/environment tokens (string colors; override via CSS vars if desired)
  get ember() { return readCssVar("--ember"); },
  get lava() { return readCssVar("--lava"); },
  get village() { return readCssVar("--village-color"); },
  get ash() { return readCssVar("--ash"); },
  get volcano() { return readCssVar("--volcano"); },
};
