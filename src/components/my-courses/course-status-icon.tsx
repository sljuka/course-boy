import { useTranslation } from "react-i18next";

import { StatusIcon } from "@/components/ui/status-icon";
import type { CourseSummary } from "@/lib/course-package";

// One of your courses at a glance, as in the Versions panel's Draft row:
// half-filled amber while the draft has changes not yet committed as a version
// (or no version yet), otherwise filled when published, dashed when local only.
export function CourseStatusIcon({ course }: { course: CourseSummary }) {
  const { t } = useTranslation();
  const status =
    course.versionBadge.kind === "draft"
      ? "changed"
      : course.publishedVersion !== null
        ? "published"
        : "local";

  return <StatusIcon aria-label={t(`myCourses.status.${status}`)} status={status} />;
}
