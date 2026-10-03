import { useTranslation } from "react-i18next";

import { getCommitBlocker } from "@/lib/course-commit-readiness";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { useAppState } from "@/lib/use-app-state";

// Why "Commit new version" is unavailable for the draft's structure, as a
// translated sentence, or null when the structure is fine (whether there are
// changes to commit is checked separately).
export function useCommitBlockerMessage(courseId: string): string | null {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: course } = useCourseDetailsQuery(courseId, locale);

  if (!course) {
    return null;
  }

  const blocker = getCommitBlocker(course.sections);

  if (!blocker) {
    return null;
  }

  return blocker.kind === "no-sections"
    ? t("courseVersions.commitBlockedNoSections")
    : t("courseVersions.commitBlockedEmptySection", { title: blocker.title });
}
