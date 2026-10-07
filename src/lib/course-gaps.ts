// What's missing in a course item, per language (shown as a red dot in the
// editor's explorer and on its language tabs). Kept to what's clearly empty:
// a title, or an exercise's prompt, in one of the course's languages. With a
// Serbian script setting, only the source script counts: the other is
// generated from it, so a gap there is the same gap.

import type { Locale } from "./i18n";
import type { SerbianScriptSetting } from "./serbian-script";
import { getGeneratedSerbianLocale } from "./serbian-script";

export type CourseItemGap = {
  // 1-based, for "exercise 2"; only on prompt gaps.
  exercise?: number;
  field: "prompt" | "title";
  locale: Locale;
};

// The languages a teacher writes in: every supported one but a generated script.
export function writtenLocales(supported: readonly Locale[], serbianScript: SerbianScriptSetting | null | undefined): Locale[] {
  const generated = getGeneratedSerbianLocale(serbianScript);
  return supported.filter((locale) => locale !== generated);
}

const isBlank = (value: unknown) => typeof value !== "string" || value.trim().length === 0;

export function titleGaps(
  locales: Partial<Record<Locale, { title?: string }>> | undefined,
  checked: readonly Locale[],
): CourseItemGap[] {
  return checked.filter((locale) => isBlank(locales?.[locale]?.title)).map((locale) => ({ field: "title", locale }));
}

export function promptGaps(
  exercises: readonly { locales?: Partial<Record<Locale, { prompt?: string }>> }[] | undefined,
  checked: readonly Locale[],
): CourseItemGap[] {
  return (exercises ?? []).flatMap((exercise, index) =>
    checked
      .filter((locale) => isBlank(exercise.locales?.[locale]?.prompt))
      .map((locale) => ({ exercise: index + 1, field: "prompt" as const, locale })),
  );
}
