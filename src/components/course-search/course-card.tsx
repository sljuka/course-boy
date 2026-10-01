import type * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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
import { formatShortDate } from "@/lib/format-date";
import { useAppState } from "@/lib/use-app-state";
import { getLocaleFlag } from "@/lib/locale-flags";

type CourseCardProps = {
  course: CourseSummary;
  href: string;
  // An icon before the title (My courses: published / local / changed).
  leading?: React.ReactNode;
};

export function CourseCard({ course, href, leading }: CourseCardProps) {
  const { t } = useTranslation();
  const { locale } = useAppState();

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="min-w-0">
        <CardHeader className="min-w-0">
          <CardTitle className="flex min-w-0 flex-wrap items-center gap-x-2">
            {leading}
            <Link className="min-w-0 wrap-break-word transition-colors hover:text-foreground" to={href}>
              {course.title}
            </Link>
            {course.lastCutAt && (
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
          <CardDescription>{course.description}</CardDescription>
          <div className="flex min-w-0 flex-wrap gap-2">
            <Badge className="max-w-full break-all">{course.id}</Badge>
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
          </div>
        </CardHeader>
      </CardContent>
    </Card>
  );
}
