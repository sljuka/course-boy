import type { Locale } from "@/lib/i18n";

const units = ["B", "KB", "MB", "GB"] as const;

// "512 B", "12 KB", "3.4 MB" — decimal only below 10 of a unit, formatted for
// the given locale (so Serbian gets "3,4 MB").
export function formatFileSize(bytes: number, locale: Locale): string {
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: unitIndex === 0 || value >= 10 ? 0 : 1,
  }).format(value);

  return `${formatted} ${units[unitIndex]}`;
}
