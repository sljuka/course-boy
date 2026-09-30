import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { StatusIcon } from "@/components/ui/status-icon";
import type { CourseSummary } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { formatShortDate } from "@/lib/format-date";
import { getLocaleFlag } from "@/lib/locale-flags";

type MyCourseRowProps = {
  course: CourseSummary;
  locale: Locale;
};

// One course on My courses: status, title, changes, languages, version and
// last edit. The whole row opens the editor, where the course's own menu is.
export function MyCourseRow({ course, locale }: MyCourseRowProps) {
  const { t } = useTranslation();
  const isPublished = course.publishedVersion !== null;
  const hasUnpublishedChanges = isPublished && course.versionBadge.kind === "draft";

  return (
    <ListRow>
      <StatusIcon status={isPublished ? "published" : "local"} />
      <ListRowLink render={<Link to={`/drafts/${course.id}`} />}>{course.title}</ListRowLink>
      {hasUnpublishedChanges && (
        <Badge variant="warning">{t("myCourses.unpublishedChanges")}</Badge>
      )}
      <ListRowMeta aria-label={t("courseSearch.localesLabel")}>
        {[...new Set(course.supportedLocales.map((supportedLocale) => getLocaleFlag(supportedLocale)))].join(" ")}
      </ListRowMeta>
      <ListRowMeta>{course.publishedVersion ?? course.version}</ListRowMeta>
      {course.updatedAt && (
        <ListRowMeta title={t("myCourses.edited", { date: new Date(course.updatedAt).toLocaleString(locale) })}>
          {formatShortDate(course.updatedAt, locale)}
        </ListRowMeta>
      )}
    </ListRow>
  );
}
