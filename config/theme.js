/**
 * Theme configuration - JavaScript as source of truth
 * Colors are defined here and injected into CSS variables on load
 */

// Define all color values in JavaScript (source of truth)
export const THEME_COLORS = {
  // Primary theme palette (FIRE THEME - orange/red)
  themeDark: "#1a0a05",
  themeOrange: "#ff6b35",
  themeLightOrange: "#ff8c42",
  themeWhite: "#ffffff",
  themeAccent: "#ffa552",
  themeYellow: "#ffd94a",

  // Backwards-compatible aliases
  white: "#ffe6d9",
  orange: "#ff6b35",
  darkOrange: "#cc5529",
  lightOrange: "#ff8c42",

  // Gameplay / UI tokens
  hp: "#ff4444",
  mp: "#4488ff",
  xp: "#ffaa44",
  bg: "#0a0503",
  enemy: "#4a0e0e",
  enemyDark: "#2b0505",

  // Glass / overlay tokens
  glass: "#1A0A05B3",
  glassStrong: "#1A0A05D9",
  accent: "#ffa552",

  // System (settings / hero / flash) theme tokens
  systemBg: "linear-gradient(180deg, #28140AF2, #1E0F08F2)",
  systemBorder: "#FF6B354D",
  systemText: "#ffe6d9",
  systemAccent: "#ffa552",

  // Common color values - for consistency
  borderOrange: "#FF8C4259",
  borderOrangeLight: "#FF8C424D",
  borderOrangeSubtle: "#FF8C4226",
  borderWhiteSubtle: "#FFFFFF1F",
  borderWhiteFaint: "#FFFFFF0F",

  // Background gradients
  bgRadialFire: "radial-gradient(1200px 1200px at 70% 30%, #2a1510 0%, #1a0f0a 50%, #0a0503 100%)",
  bgDarkFire: "#28140A99",
  bgDarkerFire: "#1A0D08CC",

  // Text colors
  textWarm: "#ffe6d9",
  textWarmLight: "#ffd4b3",

  // Shadow values
  shadowMedium: "0 8px 30px #00000059",
  shadowStrong: "0 8px 30px #00000073",

  // Glow effects
  glowOrange: "#FF8C4299",
  glowOrangeStrong: "#FF8C42CC",

  // Canvas/HUD utility colors
  roadUnderlay: "#D2C8BE26",
  roadDark: "#2B2420E6",
  villageRing: "#5AFF8B99",
  villageRingFaint: "#5AFF8B59",
  portal: "#7C4DFFE6",
  portalAlt: "#B478FFE6",
  enemyDot: "#FF5050F2",
  yellowGlowStrong: "#FFD75AF2",
  playerDot: "#7ECCFFFF",

  // Structure minimap colors
  templeDot: "#FFD700F2",
  villaDot: "#FFA500F2",
  columnDot: "#F0E68CF2",
  statueDot: "#DAA520F2",
  obeliskDot: "#CD853FF2",

  // Skill/environment shared tokens
  ember: "#ffa500",
  lava: "#ff4500",
  village: "#ffb347",
  ash: "#696969",
  volcano: "#8b4513",
  
  // Environment-specific colors
  ambientDark: "#8b2500",
  rock: "#3a2520",
  trunk: "#2a1a12",
  stem: "#4a2a1a",
  darkFire: "#8b0000",
  tomato: "#ff6347",

  // Hero character colors
  heroSkin: "#ffe8db",
  heroSkinEmissive: "#5a2b10",
  heroBeard: "#fff4e6",
  heroBeardEmissive: "#6b3a12",
  heroCrown: "#ffe8cf",
  heroBodyEmissive: "#5a2a0a",
  heroCloak: "#3e1f0a",
  heroCloakEmissive: "#2a1506",
  heroShoulderEmissive: "#3e1e0a",
  heroBelt: "#ffd89f",
  heroHair: "#3a2313",
  heroHairEmissive: "#291509",
  heroHandLight: "#ffb366",

  // Enemy colors
  enemyBodyEmissive: "#2a0a0a",
  enemyEyeEmissive: "#550000",
  enemyEye: "#ffffff",

  // UI bar colors
  hpBarBg: "#222222",
  hpBarFill: "#ff4545",
  overheadBarBg: "#111111",

  // Structure colors
  portalBase: "#0e1e38",
  houseBase: "#5c2515",
  sandstone: "#f4e8dc",
  villaBase: "#5c3115",
  villaPorchColumn: "#f4eee8",

  // Tree foliage colors (fire theme)
  cypressFoliage: "#8f4a3c",
  oliveCanopy: "#8f6a4a",

  // Map-specific enemy tints
  mapAct1: "#ff8080",      // Act I - Fields of Awakening (light coral/pink)
  mapAct2: "#ffb060",      // Act II - Volcanic Plains (warm orange)
  mapAct3: "#ffe070",      // Act III - Inferno Peaks (golden yellow-orange)
  mapAct4: "#a0ffd1",      // Act IV - Sky Citadel (cyan/teal)
  mapAct5: "#9fd8ff",      // Act V - The Godforge (light azure blue)
};

/**
 * Converts camelCase to kebab-case for CSS variable names
 */
function toKebabCase(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Injects theme colors into CSS custom properties
 * Call this on game load to populate CSS variables from JavaScript
 */
export function initializeTheme(customColors = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Merge custom colors with defaults
  const colors = { ...THEME_COLORS, ...customColors };

  // Set each color as a CSS variable
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    const cssVarName = `--${toKebabCase(key)}`;
    root.style.setProperty(cssVarName, value);
  });

  // Dispatch event to signal theme is ready
  try {
    window.dispatchEvent(new Event("theme-initialized"));
  } catch (_) {}
}

/**
 * Update a specific theme color dynamically
 * @param {string} colorKey - The color key from THEME_COLORS (e.g., 'themeOrange')
 * @param {string} value - The new color value (e.g., '#ff0000')
 */
export function updateThemeColor(colorKey, value) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  
  const cssVarName = `--${toKebabCase(colorKey)}`;
  document.documentElement.style.setProperty(cssVarName, value);
  
  // Also update the THEME_COLORS object
  THEME_COLORS[colorKey] = value;
}

/**
 * CSS variable references for DOM styling (preferred for live theming)
 * Dynamically generated from THEME_COLORS keys
 * Example: themeDark -> "var(--theme-dark)"
 */
export const CSS_VAR = Object.keys(THEME_COLORS).reduce((acc, key) => {
  acc[key] = `var(--${toKebabCase(key)})`;
  return acc;
}, {});
