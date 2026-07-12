import { BookOpen, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CourseSummary } from "@/lib/course-package";
import { useAppState } from "@/lib/use-app-state";

const localeFlags: Record<CourseSummary["supportedLocales"][number], string> = {
  en: "🇬🇧",
  sr: "🇷🇸",
  "sr-Cyrl": "🇷🇸",
};

export const CourseSearchPage = () => {
  const { locale } = useAppState();
  const { t } = useTranslation();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setErrorMessage(null);

    window.courses
      .list(locale)
      .then((nextCourses) => {
        if (!isMounted) {
          return;
        }

        setCourses(nextCourses);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setErrorMessage(t("courseSearch.error"));
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [locale, t]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return courses;
    }

    return courses.filter((course) => {
      return [course.title, course.description, course.id]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [courses, query]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <div className="px-2 py-1">
        <CardTitle className="text-3xl sm:text-4xl">
          {t("courseSearch.title")}
        </CardTitle>
        <CardDescription className="mt-3 max-w-3xl text-base text-stone-700">
          {t("courseSearch.subtitle")}
        </CardDescription>
      </div>
      <div className="px-2">
        <label className="relative block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
          />
          <Input
            className="h-13 rounded-2xl border-stone-300/90 bg-white/80 pl-12 text-base"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("courseSearch.placeholder")}
            value={query}
          />
        </label>
      </div>

      {isLoading ? (
        <Card className="overflow-hidden">
          <CardContent className="py-10 text-sm text-stone-600">
            {t("courseSearch.loading")}
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card className="overflow-hidden">
          <CardContent className="py-10 text-sm text-rose-700">
            {errorMessage}
          </CardContent>
        </Card>
      ) : filteredCourses.length === 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="py-10 text-sm text-stone-600">
            {t("courseSearch.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCourses.map((course) => (
            <Card className="overflow-hidden" key={course.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <CardTitle className="text-2xl">
                    <Link
                      className="transition-colors hover:text-blue-700"
                      to={`/courses/${course.id}`}
                    >
                      {course.title}
                    </Link>
                  </CardTitle>
                  <span className="text-sm text-stone-500">
                    {t("courseSearch.version", { version: course.version })}
                  </span>
                </div>
                <CardDescription className="text-base">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 pt-0 text-sm text-stone-600">
                <span className="rounded-full border border-stone-300/80 bg-white/60 px-3 py-1">
                  {course.id}
                </span>
                <span className="rounded-full border border-stone-300/80 bg-white/60 px-3 py-1">
                  <span aria-label={t("courseSearch.localesLabel")}>
                    {[...new Set(
                      course.supportedLocales.map(
                        (supportedLocale) => localeFlags[supportedLocale] ?? "🏳️",
                      ),
                    )]
                      .join(" ")}
                  </span>
                </span>
              </CardContent>
              <CardContent className="pt-4">
                <div className="-mx-2 overflow-x-auto px-2 pb-2">
                  <div className="flex min-w-max gap-3">
                    {course.lessonPreviews.slice(0, 6).map((lesson) => (
                      <div className="flex flex-col items-center gap-2" key={lesson.id}>
                        <div
                          className={buttonVariants({
                            appearance: "squareTileMd",
                            variant: "secondary",
                          })}
                        >
                          {lesson.iconUrl ? (
                            <img
                              alt=""
                              className="h-12 w-12 object-contain"
                              src={lesson.iconUrl}
                            />
                          ) : (
                            <BookOpen
                              aria-hidden="true"
                              className="h-12 w-12 text-stone-700"
                            />
                          )}
                        </div>
                        <span className="max-w-32 text-center text-sm font-semibold text-stone-900">
                          {lesson.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
