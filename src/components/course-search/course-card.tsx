import type * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useCourseProgressLabel } from "@/components/course-progress/course-progress-label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CourseSummary } from "@/lib/course-package";
import type { CourseProgressSummary } from "@/lib/course-progress";
import { PublishedBy } from "@/components/publishers/publisher-name";
import type { CourseUpdateInfo } from "@/lib/sharing";
import { formatShortDate } from "@/lib/format-date";
import { useAppState } from "@/lib/use-app-state";
import { getLocaleFlag } from "@/lib/locale-flags";

type CourseCardProps = {
  course: CourseSummary;
  href: string;
  // An icon before the title (My courses: published / local / changed;
  // Home: the favorite star).
  leading?: React.ReactNode;
  // Home: how far the student is (SLJ-50), shown as "3 of 8 done" or
  // "Finished" once started.
  progress?: { isStarted: boolean; summary: CourseProgressSummary };
  // An imported course's pending update (SLJ-39), shown as a badge.
  update?: CourseUpdateInfo;
  // The Cards view's small card (SLJ-64): the design system's small Card,
  // without the commit date, version and languages.
  compact?: boolean;
};

export function CourseCard({ compact = false, course, href, leading, progress, update }: CourseCardProps) {
  const { t } = useTranslation();
  // An imported course's publisher (SLJ-108): their name in Publishers, else the short id.
  const progressLabel = useCourseProgressLabel(progress?.summary, progress?.isStarted ?? false);
  const { locale } = useAppState();

  return (
    <Card className="min-w-0 overflow-hidden" data-testid={compact ? "course-card-compact" : "course-card"} size={compact ? "sm" : "default"}>
      <CardContent className="min-w-0">
        <CardHeader className="min-w-0">
          <CardTitle className="flex min-w-0 flex-wrap items-center gap-x-2">
            {leading}
            <Link className="min-w-0 wrap-break-word transition-colors hover:text-foreground" to={href}>
              {course.title}
            </Link>
            {!compact && course.lastCutAt && (
              <CardDescription
                className="text-xs font-normal"
                title={t("myCourses.lastCommitted", {
                  date: new Date(course.lastCutAt).toLocaleString(locale),
                })}
              >
                {formatShortDate(course.lastCutAt, locale)}
              </CardDescription>
            )}
          </CardTitle>
          {course.publishedBy.length > 0 && (
            <CardDescription data-testid="course-publisher">
              <PublishedBy publishers={course.publishedBy} />
            </CardDescription>
          )}
          <CardDescription>{course.description}</CardDescription>
          <div className="flex min-w-0 flex-wrap gap-2">
            {progressLabel && (
              <Badge data-testid="course-progress-label" variant={progress?.summary.completedAt ? "success" : "secondary"}>
                {progressLabel}
              </Badge>
            )}
            {update && (
              <Badge data-testid="course-update-badge" variant={update.kind === "recommended" ? "warning" : "info"}>
                {update.kind === "recommended"
                  ? t("courseUpdates.recommendedBadge", { version: update.version })
                  : t("courseUpdates.availableBadge", { version: update.version })}
              </Badge>
            )}
            {course.isBuiltIn && (
              <Badge variant="secondary">{t("home.builtInBadge")}</Badge>
            )}
            {!compact && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge
                    className="font-normal"
                    variant={course.versionBadge.kind === "draft" ? "warning" : "secondary"}
                  >
                    {course.versionBadge.kind === "draft"
                      ? t("courseSearch.draftBadge")
                      : t("courseSearch.version", { version: course.versionBadge.version })}
                  </Badge>
                }
              />
              <TooltipContent side="bottom">
                {course.versionBadge.kind === "draft"
                  ? t("courseSearch.draftBadgeTooltip")
                  : t("courseSearch.versionTooltip")}
              </TooltipContent>
            </Tooltip>
            )}
            {!compact && (
            <Badge className="max-w-full" variant="secondary">
              <span aria-label={t("courseSearch.localesLabel")}>
                {[
                  ...new Set(
                    course.supportedLocales.map(
                      (supportedLocale) => getLocaleFlag(supportedLocale),
                    ),
                  ),
                ].join(" ")}
              </span>
            </Badge>
            )}
          </div>
        </CardHeader>
      </CardContent>
    </Card>
  );
}
