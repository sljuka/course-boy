import type { Locale } from "@/lib/i18n";

const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  sr: "🇷🇸",
  "sr-Cyrl": "🇷🇸",
};

export function getLocaleFlag(locale: Locale): string {
  return localeFlags[locale] ?? "🏳️";
}
