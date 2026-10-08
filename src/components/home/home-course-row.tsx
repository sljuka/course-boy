import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CourseFavoriteToggle } from "@/components/course-progress/course-favorite-toggle";
import { useCourseProgressLabel } from "@/components/course-progress/course-progress-label";
import { Badge } from "@/components/ui/badge";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { StatusIcon } from "@/components/ui/status-icon";
import type { CourseSummary } from "@/lib/course-package";
import type { CourseProgressSummary } from "@/lib/course-progress";
import { getLocaleFlag } from "@/lib/locale-flags";
import type { CourseUpdateInfo } from "@/lib/sharing";

// One course in Home's table view: where the student is in it, its star, the
// title, "Built in" for the bundled tutorial, a pending update, how much is
// done, languages and the version in use. The whole row opens the course.
export function HomeCourseRow({
  course,
  isStarted,
  summary,
  update,
}: {
  course: CourseSummary;
  isStarted: boolean;
  summary: CourseProgressSummary;
  update?: CourseUpdateInfo;
}) {
  const { t } = useTranslation();
  const progressLabel = useCourseProgressLabel(summary, isStarted);

  return (
    <ListRow>
      {/* Finished, started, or ready to take (imported or built in alike). */}
      <StatusIcon status={summary.completedAt ? "done" : isStarted ? "changed" : "published"} />
      {/* Above the row's stretched link, so it toggles instead of opening the course. */}
      <ListRowActions>
        <CourseFavoriteToggle courseId={course.id} />
      </ListRowActions>
      <ListRowLink render={<Link to={`/courses/${course.id}`} />}>{course.title}</ListRowLink>
      {course.distribution === "bundled" && <Badge variant="secondary">{t("home.builtInBadge")}</Badge>}
      {update && (
        <Badge data-testid="course-update-badge" variant={update.kind === "recommended" ? "warning" : "info"}>
          {update.kind === "recommended"
            ? t("courseUpdates.recommendedBadge", { version: update.version })
            : t("courseUpdates.availableBadge", { version: update.version })}
        </Badge>
      )}
      <ListRowMeta align="end" className="w-28" data-testid="course-progress-label">
        {progressLabel}
      </ListRowMeta>
      <ListRowMeta align="end" aria-label={t("courseSearch.localesLabel")} className="w-14">
        {[...new Set(course.supportedLocales.map((supportedLocale) => getLocaleFlag(supportedLocale)))].join(" ")}
      </ListRowMeta>
      <ListRowMeta align="end" className="w-12">
        {course.version}
      </ListRowMeta>
    </ListRow>
  );
}
