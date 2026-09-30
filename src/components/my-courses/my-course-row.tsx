import { MoreHorizontal, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { StatusIcon } from "@/components/ui/status-icon";
import type { CourseSummary } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";

// "Sep 27" this year, "Sep 27, 2025" otherwise — in the app's language.
function formatEditedDate(isoDate: string, locale: Locale): string {
  const date = new Date(isoDate);
  const isThisYear = date.getFullYear() === new Date().getFullYear();

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(isThisYear ? {} : { year: "numeric" }),
  }).format(date);
}

type MyCourseRowProps = {
  course: CourseSummary;
  locale: Locale;
  onRemove: (course: CourseSummary) => void;
};

// One course on My courses: status, title, changes, languages, version, last
// edit, and its menu. The whole row opens the editor.
export function MyCourseRow({ course, locale, onRemove }: MyCourseRowProps) {
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
          {formatEditedDate(course.updatedAt, locale)}
        </ListRowMeta>
      )}
      <ListRowActions>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={t("courseSearch.courseMenuLabel", { title: course.title })}
                size="icon-xs"
                variant="ghost"
              />
            }
          >
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onRemove(course)} variant="destructive">
              <Trash2 aria-hidden="true" />
              {t("courseSearch.removeCourse")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ListRowActions>
    </ListRow>
  );
}
