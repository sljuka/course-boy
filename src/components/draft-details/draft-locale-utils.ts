import { locales, type Locale } from "@/lib/i18n";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function normalizeSupportedLocales(
  nextLocales: string[],
  fallback: Locale,
): Locale[] {
  const localeSet = new Set<Locale>();

  for (const locale of nextLocales) {
    if (isLocale(locale)) {
      localeSet.add(locale);
    }
  }

  if (localeSet.size === 0) {
    localeSet.add(fallback);
  }

  return locales.filter((locale) => localeSet.has(locale));
}

export function getLocaleLabel(locale: Locale, t: (key: string) => string) {
  if (locale === "sr") {
    return t("language.serbian");
  }

  if (locale === "sr-Cyrl") {
    return t("language.serbianCyrillic");
  }

  return t("language.english");
}
