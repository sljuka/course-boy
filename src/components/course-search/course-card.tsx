import { ArrowRight, MoreHorizontal, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CoursePreviewStrip } from "@/components/course-preview-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import type { CourseSummary } from "@/lib/course-package";
import { getLocaleFlag } from "@/lib/locale-flags";

type CourseCardProps = {
  course: CourseSummary;
  onRemove: (course: CourseSummary) => void;
};

export function CourseCard({ course, onRemove }: CourseCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="min-w-0">
        <CardHeader
          className="min-w-0"
          subtitle={
            <CardDescription className="text-base">
              {course.description}
            </CardDescription>
          }
          title={
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="min-w-0 flex-1 text-2xl">
                <Link
                  className="flex min-w-0 items-center gap-1 transition-colors hover:text-stone-700"
                  to={`/courses/${course.id}`}
                >
                  <span className="min-w-0 break-words">{course.title}</span>
                  <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0" />
                </Link>
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label={t("courseSearch.courseMenuLabel", {
                      title: course.title,
                    })}
                    className="shrink-0 border-transparent bg-transparent shadow-none hover:bg-stone-100"
                    size="icon"
                    variant="secondary"
                  >
                    <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-700 hover:bg-red-50 hover:text-red-800 focus-visible:ring-red-500"
                    onSelect={() => {
                      onRemove(course);
                    }}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    {t("courseSearch.removeCourse")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        >
          <div className="flex min-w-0 flex-wrap gap-2">
            <Badge className="max-w-full break-all">{course.id}</Badge>
            <Badge className="font-normal" variant="secondary">
              {t("courseSearch.version", { version: course.version })}
            </Badge>
            <Badge className="max-w-full">
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
        <div className="max-w-full overflow-x-auto">
          <CoursePreviewStrip items={course.previewItems} />
        </div>
      </CardContent>
    </Card>
  );
}
