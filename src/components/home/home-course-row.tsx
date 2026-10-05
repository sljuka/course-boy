import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { StatusIcon } from "@/components/ui/status-icon";
import type { CourseSummary } from "@/lib/course-package";
import { getLocaleFlag } from "@/lib/locale-flags";
import type { CourseUpdateInfo } from "@/lib/sharing";

// One course in Home's table view: title, "Built in" for the bundled tutorial,
// a pending update, languages and the version in use. The whole row opens the course.
export function HomeCourseRow({ course, update }: { course: CourseSummary; update?: CourseUpdateInfo }) {
  const { t } = useTranslation();

  return (
    <ListRow>
      {/* Ready to take, imported or built in alike; the badge tells them apart. */}
      <StatusIcon status="published" />
      <ListRowLink render={<Link to={`/courses/${course.id}`} />}>{course.title}</ListRowLink>
      {course.distribution === "bundled" && <Badge variant="secondary">{t("home.builtInBadge")}</Badge>}
      {update && (
        <Badge data-testid="course-update-badge" variant={update.kind === "recommended" ? "warning" : "info"}>
          {update.kind === "recommended"
            ? t("courseUpdates.recommendedBadge", { version: update.version })
            : t("courseUpdates.availableBadge", { version: update.version })}
        </Badge>
      )}
      <ListRowMeta align="end" aria-label={t("courseSearch.localesLabel")} className="w-14">
        {[...new Set(course.supportedLocales.map((supportedLocale) => getLocaleFlag(supportedLocale)))].join(" ")}
      </ListRowMeta>
      <ListRowMeta align="end" className="w-12">
        {course.version}
      </ListRowMeta>
    </ListRow>
  );
}
