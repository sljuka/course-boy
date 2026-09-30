import type { Locale } from "@/lib/i18n";

// "Sep 27" for dates this year, "Sep 27, 2025" otherwise — in the app's
// language. Used for compact list columns (last edited, cut at).
export function formatShortDate(isoDate: string, locale: Locale): string {
  const date = new Date(isoDate);
  const isThisYear = date.getFullYear() === new Date().getFullYear();

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(isThisYear ? {} : { year: "numeric" }),
  }).format(date);
}
