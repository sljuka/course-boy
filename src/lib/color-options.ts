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
