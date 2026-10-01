import { createContext, useContext } from "react";

import type { Locale } from "@/lib/i18n";
import { otherSerbianLocale, type SerbianLocale, type SerbianScriptSetting } from "@/lib/serbian-script";

// The open course's Serbian script setting (SLJ-17), provided by the course
// editor layout so every language tab bar (course, section, lesson, test,
// exercise) knows which tab is generated without passing it through each
// editor. Outside a course (e.g. creating one) there is none.
export const SerbianScriptContext = createContext<SerbianScriptSetting | null>(null);

export type GeneratedSerbianLocale = { generated: SerbianLocale; source: SerbianLocale };

// The generated Serbian locale and its source, or null when both are written
// by hand.
export function useGeneratedSerbianLocale(): GeneratedSerbianLocale | null {
  const setting = useContext(SerbianScriptContext);

  return setting ? { generated: otherSerbianLocale(setting.source), source: setting.source } : null;
}

export function isGeneratedLocale(
  generatedLocale: GeneratedSerbianLocale | null,
  locale: Locale,
): boolean {
  return generatedLocale?.generated === locale;
}
