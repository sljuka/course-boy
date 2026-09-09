import { ArrowRight, MoreHorizontal, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CourseSummary } from "@/lib/course-package";
import { getLocaleFlag } from "@/lib/locale-flags";

type CourseCardProps = {
  course: CourseSummary;
  href: string;
  onRemove: (course: CourseSummary) => void;
};

export function CourseCard({ course, href, onRemove }: CourseCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="min-w-0">
        <CardHeader className="min-w-0">
          <CardTitle className="min-w-0">
            <Link
              className="flex min-w-0 items-center gap-1 transition-colors hover:text-stone-700"
              to={href}
            >
              <span className="min-w-0 wrap-break-word">{course.title}</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </CardTitle>
          <CardDescription>{course.description}</CardDescription>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label={t("courseSearch.courseMenuLabel", {
                      title: course.title,
                    })}
                    className="shrink-0 border-transparent bg-transparent shadow-none hover:bg-stone-100"
                    size="icon-sm"
                    variant="secondary"
                  />
                }
              >
                <MoreHorizontal aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-700 hover:bg-red-50 hover:text-red-800 focus-visible:ring-red-500"
                  onClick={() => {
                    onRemove(course);
                  }}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  {t("courseSearch.removeCourse")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
          <div className="flex min-w-0 flex-wrap gap-2">
            <Badge className="max-w-full break-all">{course.id}</Badge>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge className="font-normal" variant="secondary">
                    {t("courseSearch.version", { version: course.version })}
                  </Badge>
                }
              />
              <TooltipContent>{t("courseSearch.versionTooltip")}</TooltipContent>
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
