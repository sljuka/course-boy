import type { ProgramTheme, ProgramThemeColor } from "@/lib/program-package";

// A program's theme (SLJ-32): one palette that recolors the whole app while
// the reader is on the program's page or in one of its courses (see
// program-theme-scope.tsx), whatever their own light or dark mode.
//
// The teacher sets the three core colors (background, text, main color) and
// as many of the app's other color variables as they like. Each one left out
// is derived from the core, mixed to a real color here, so every pair can be
// checked for readability. With `enforceReadability`:
// - the core pair (text on background) must read (4.5:1), or the theme isn't
//   applied at all and the app's own colors stay;
// - any other pair the teacher set that doesn't read is replaced by the
//   derived one, and reported.
// Off for now (2026-10-08): themes apply exactly as picked while the colors
// are being explored. Turn it on in ProgramThemeScope's call.

// WCAG's contrast ratio between two `#rrggbb` colors.
export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

// `percent` of `color` over `base`, as a color of its own.
function mix(color: string, percent: number, base: string): string {
  const [a, b] = [rgb(color), rgb(base)];
  return `#${a
    .map((value, index) => Math.round((value * percent + b[index] * (100 - percent)) / 100))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

// White or black, whichever reads better on `background`.
export function readableTextOn(background: string): string {
  return contrastRatio("#ffffff", background) >= contrastRatio("#000000", background) ? "#ffffff" : "#000000";
}

const TEXT_CONTRAST = 4.5;
// Secondary (muted) text only needs to stand out.
const SOFT_CONTRAST = 3;

// Background/text pairs checked when the teacher set either side.
const PAIRS: { background: ProgramThemeColor; minimum: number; text: ProgramThemeColor }[] = [
  { background: "primary", minimum: TEXT_CONTRAST, text: "primary-foreground" },
  { background: "card", minimum: TEXT_CONTRAST, text: "card-foreground" },
  { background: "popover", minimum: TEXT_CONTRAST, text: "popover-foreground" },
  { background: "secondary", minimum: TEXT_CONTRAST, text: "secondary-foreground" },
  { background: "accent", minimum: TEXT_CONTRAST, text: "accent-foreground" },
  { background: "background", minimum: SOFT_CONTRAST, text: "muted-foreground" },
  { background: "sidebar", minimum: TEXT_CONTRAST, text: "sidebar-foreground" },
  { background: "sidebar-primary", minimum: TEXT_CONTRAST, text: "sidebar-primary-foreground" },
  { background: "sidebar-accent", minimum: TEXT_CONTRAST, text: "sidebar-accent-foreground" },
];

// Text colors on a solid color: white or black when the pair is replaced.
const ON_SOLID = new Set<ProgramThemeColor>(["primary-foreground", "sidebar-primary-foreground"]);

export type ResolvedProgramTheme = {
  // Every color variable, ready to set (`--background`, …), plus
  // `--cover-color` for the program's banner.
  variables: Record<string, string>;
  // Dark by its background, so the app's dark-mode styling and native
  // controls (scrollbars) match.
  isDark: boolean;
  // Pairs the teacher set that didn't read, replaced by derived colors.
  unreadable: { background: ProgramThemeColor; text: ProgramThemeColor }[];
};

// Null when the theme can't be applied: with `enforceReadability`, its text
// doesn't read on its background.
export function resolveProgramTheme(
  theme: ProgramTheme,
  { enforceReadability = false }: { enforceReadability?: boolean } = {},
): ResolvedProgramTheme | null {
  const { background, foreground, primary } = theme;
  if (enforceReadability && contrastRatio(foreground, background) < TEXT_CONTRAST) return null;

  const derived: Record<ProgramThemeColor, string> = {
    background,
    foreground,
    primary,
    "primary-foreground": readableTextOn(primary),
    card: background,
    "card-foreground": foreground,
    popover: background,
    "popover-foreground": foreground,
    secondary: mix(primary, 14, background),
    "secondary-foreground": foreground,
    muted: mix(foreground, 6, background),
    "muted-foreground": mix(foreground, 65, background),
    accent: mix(primary, 10, background),
    "accent-foreground": foreground,
    border: mix(foreground, 14, background),
    input: mix(foreground, 18, background),
    ring: primary,
    sidebar: mix(foreground, 4, background),
    "sidebar-foreground": foreground,
    "sidebar-primary": primary,
    "sidebar-primary-foreground": readableTextOn(primary),
    "sidebar-accent": mix(foreground, 9, background),
    "sidebar-accent-foreground": foreground,
    "sidebar-border": mix(foreground, 12, background),
    "sidebar-ring": primary,
  };
  const colors: Record<ProgramThemeColor, string> = { ...derived, ...theme };

  const unreadable: ResolvedProgramTheme["unreadable"] = [];
  for (const pair of enforceReadability ? PAIRS : []) {
    const setByTeacher = pair.background in theme || pair.text in theme;
    if (setByTeacher && contrastRatio(colors[pair.text], colors[pair.background]) < pair.minimum) {
      unreadable.push({ background: pair.background, text: pair.text });
      colors[pair.background] = derived[pair.background];
      colors[pair.text] = ON_SOLID.has(pair.text) ? readableTextOn(colors[pair.background]) : derived[pair.text];
    }
  }

  return {
    isDark: luminance(colors.background) < 0.18,
    unreadable,
    variables: {
      ...Object.fromEntries(Object.entries(colors).map(([name, color]) => [`--${name}`, color])),
      "--cover-color": colors.primary,
    },
  };
}
