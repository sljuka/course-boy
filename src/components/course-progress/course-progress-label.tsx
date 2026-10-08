import { useTranslation } from "react-i18next";

import type { CourseProgressSummary } from "@/lib/course-progress";

// "3 of 8 done", or "Finished", or nothing before the course is started.
export function useCourseProgressLabel(summary: CourseProgressSummary | undefined, isStarted: boolean): string | null {
  const { t } = useTranslation();

  if (!summary || summary.total === 0) return null;
  if (summary.completedAt) return t("courseProgress.finished");
  if (!isStarted) return null;

  return t("courseProgress.doneOf", { done: summary.done, total: summary.total });
}
