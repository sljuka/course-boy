import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Picks readable black/white text for an arbitrary background color (e.g. a
 * user-chosen hex value that can't be a fixed cva variant). Falls back to
 * dark text for anything unparseable, since most custom colors picked for a
 * "lighter colors as markers" palette will be light. */
export function getContrastTextColor(backgroundColor: string): string {
  const match = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.exec(backgroundColor.trim())

  if (!match) {
    return "#1c1917"
  }

  const hex = match[1]
  const fullHex = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex
  const r = Number.parseInt(fullHex.slice(0, 2), 16)
  const g = Number.parseInt(fullHex.slice(2, 4), 16)
  const b = Number.parseInt(fullHex.slice(4, 6), 16)
  const luminance = (r * 299 + g * 587 + b * 114) / 1000

  return luminance > 150 ? "#1c1917" : "#ffffff"
}
