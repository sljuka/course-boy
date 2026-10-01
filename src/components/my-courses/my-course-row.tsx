import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { CourseStatusIcon } from "@/components/my-courses/course-status-icon";
import type { CourseSummary } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { formatShortDate } from "@/lib/format-date";
import { getLocaleFlag } from "@/lib/locale-flags";

type MyCourseRowProps = {
  course: CourseSummary;
  locale: Locale;
};

// One course on My courses: status (incl. uncommitted changes), title, languages, version and
// last edit. The whole row opens the editor, where the course's own menu is.
export function MyCourseRow({ course, locale }: MyCourseRowProps) {
  const { t } = useTranslation();

  return (
    <ListRow>
      <CourseStatusIcon course={course} />
      <ListRowLink render={<Link to={`/drafts/${course.id}`} />}>{course.title}</ListRowLink>
      {/* Fixed-width, right-aligned columns, so every row's columns line up
          whatever the text width ("Oct 1" vs "Sep 29"), like Linear. */}
      <ListRowMeta align="end" aria-label={t("courseSearch.localesLabel")} className="w-14">
        {[...new Set(course.supportedLocales.map((supportedLocale) => getLocaleFlag(supportedLocale)))].join(" ")}
      </ListRowMeta>
      <ListRowMeta align="end" className="w-12">
        {course.publishedVersion ?? course.version}
      </ListRowMeta>
      <ListRowMeta
        align="end"
        className="w-16"
        title={
          course.updatedAt
            ? t("myCourses.edited", { date: new Date(course.updatedAt).toLocaleString(locale) })
            : undefined
        }
      >
        {course.updatedAt ? formatShortDate(course.updatedAt, locale) : null}
      </ListRowMeta>
    </ListRow>
  );
}
