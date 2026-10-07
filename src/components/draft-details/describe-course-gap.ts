import { getLocaleLabel } from "@/components/draft-details/draft-locale-utils";
import type { CourseItemGap } from "@/lib/course-gaps";

// "No title in Srpski", "No prompt in English (exercise 2)": a gap
// (lib/course-gaps.ts) as the explorer's dot and the Commit dialog say it.
export function describeCourseGap(
  gap: CourseItemGap,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const language = getLocaleLabel(gap.locale, t);
  return gap.field === "title"
    ? t("explorer.gapTitle", { language })
    : t("explorer.gapPrompt", { exercise: gap.exercise, language });
}
