import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CourseLoadingCard } from "@/components/course-loading-card";
import { CoursePreviewStrip } from "@/components/course-preview-strip";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CourseSummary } from "@/lib/course-package";
import { useCoursesQuery } from "@/lib/course-queries";
import { useAppState } from "@/lib/use-app-state";

const localeFlags: Record<CourseSummary["supportedLocales"][number], string> = {
  en: "🇬🇧",
  sr: "🇷🇸",
  "sr-Cyrl": "🇷🇸",
};

export const CourseList = ({ query }: { query: string }) => {
  const { locale } = useAppState();
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useCoursesQuery(locale, {
    throwOnError: true,
  });

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return courses;
    }

    return courses.filter((course) => {
      return [course.title, course.description, course.id].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [courses, query]);

  if (isLoading) {
    return <CourseLoadingCard message={t("courseSearch.loading")} />;
  }

  if (filteredCourses.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="py-10 text-sm text-stone-600">
          {t("courseSearch.empty")}
        </CardContent>
      </Card>
    );
  }

  return filteredCourses.map((course) => (
    <Card className="min-w-0 overflow-hidden" key={course.id}>
      <CardContent className="min-w-0">
        <CardHeader
          className="min-w-0"
          subtitle={
            <CardDescription className="text-base">
              {course.description}
            </CardDescription>
          }
          title={
            <CardTitle className="text-2xl">
              <Link
                className="flex min-w-0 items-center gap-1 transition-colors hover:text-stone-700"
                to={`/courses/${course.id}`}
              >
                <span className="min-w-0 break-words">{course.title}</span>
                <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0" />
              </Link>
            </CardTitle>
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
                      (supportedLocale) => localeFlags[supportedLocale] ?? "🏳️",
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
  ));
};
