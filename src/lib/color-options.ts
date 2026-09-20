// A curated palette of light colors for "use lighter colors as markers" —
// shared by every feature that lets a teacher color-code something (word
// types, exercise variables, ...).
export const LIGHT_COLOR_OPTIONS = [
  { hex: "#fecaca", name: "Red" },
  { hex: "#fed7aa", name: "Orange" },
  { hex: "#fde68a", name: "Amber" },
  { hex: "#fef08a", name: "Yellow" },
  { hex: "#d9f99d", name: "Lime" },
  { hex: "#bbf7d0", name: "Green" },
  { hex: "#99f6e4", name: "Teal" },
  { hex: "#bae6fd", name: "Sky" },
  { hex: "#bfdbfe", name: "Blue" },
  { hex: "#e9d5ff", name: "Purple" },
  { hex: "#fbcfe8", name: "Pink" },
  { hex: "#e7e5e4", name: "Stone" },
];

export function pickRandomLightColor(): string {
  const index = Math.floor(Math.random() * LIGHT_COLOR_OPTIONS.length);

  return LIGHT_COLOR_OPTIONS[index].hex;
}

/**
 * Prefers a color not already in `usedColors`, so a legend of several
 * regions/regions stays visually unambiguous — falls back to a fully random
 * pick once every candidate color is already in use. `exclude` defaults to
 * "Stone": most diagrams a teacher picks (e.g. the bundled Europe/Africa
 * maps) already render their regions in light grey by default, so a region
 * assigned that color would look unmarked even once correctly colored.
 */
export function pickUnusedLightColor(
  usedColors: string[],
  options: { exclude?: string[] } = {},
): string {
  const exclude = new Set(options.exclude ?? ["Stone"]);
  const pool = LIGHT_COLOR_OPTIONS.filter((option) => !exclude.has(option.name));
  const used = new Set(usedColors);
  const unused = pool.filter((option) => !used.has(option.hex));
  const candidates = unused.length > 0 ? unused : pool;

  return candidates[Math.floor(Math.random() * candidates.length)].hex;
}
