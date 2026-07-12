import { ArrowLeft, BookOpen, Star } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import type { CourseDetails } from "@/lib/course-package";
import { useAppState } from "@/lib/use-app-state";

export const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { locale } = useAppState();
  const { t } = useTranslation();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!courseId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsFavorite(false);

    window.courses
      .get(courseId, locale)
      .then((nextCourse) => {
        if (!isMounted) {
          return;
        }

        setCourse(nextCourse);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setErrorMessage(t("courseDetails.error"));
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseId, locale, t]);

  if (!courseId) {
    return <Navigate replace to="/" />;
  }

  return (
    <div className="flex w-full max-w-7xl flex-col gap-8 self-center">
      <div className="px-2">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
          to="/"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("courseDetails.back")}
        </Link>
      </div>

      {isLoading ? (
        <Card className="overflow-hidden">
          <CardContent className="py-10 text-sm text-stone-600">
            {t("courseDetails.loading")}
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card className="overflow-hidden">
          <CardContent className="py-10 text-sm text-rose-700">
            {errorMessage}
          </CardContent>
        </Card>
      ) : !course ? (
        <Card className="overflow-hidden">
          <CardContent className="py-10 text-sm text-stone-600">
            {t("courseDetails.missing")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 px-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <CardTitle className="text-3xl">{course.title}</CardTitle>
                <span className="text-sm text-stone-500">
                  {t("courseSearch.version", { version: course.version })}
                </span>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <a
                  className={buttonVariants({
                    size: "sm",
                    variant: "default",
                  })}
                  href={`#${course.entrySectionId}`}
                >
                  {t("courseDetails.startCourse")}
                </a>
                <Button
                  aria-label={t(
                    isFavorite ? "removeFavoriteCourse" : "favoriteCourse",
                  )}
                  className="!w-10 shrink-0 rounded-full px-0"
                  onClick={() => setIsFavorite((currentValue) => !currentValue)}
                  size="sm"
                  variant={isFavorite ? "default" : "secondary"}
                >
                  <Star
                    aria-hidden="true"
                    className={isFavorite ? "h-5 w-5 fill-current" : "h-5 w-5"}
                  />
                </Button>
              </div>
            </div>
            <CardDescription className="max-w-3xl text-base text-stone-700">
              {course.description}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-4">
            {course.sections.map((section) => (
              <Card
                className="overflow-hidden border-stone-200/80 bg-stone-50/80 shadow-none"
                id={section.id}
                key={section.id}
              >
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-base font-semibold text-stone-900">
                      {section.title}
                    </div>
                    {section.description ? (
                      <CardDescription className="text-sm text-stone-600">
                        {section.description}
                      </CardDescription>
                    ) : null}
                  </div>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex min-w-max gap-3">
                      {section.lessonPreviews.map((lesson) => (
                        <div
                          className="flex flex-col items-center gap-2"
                          key={lesson.id}
                        >
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
        </>
      )}
    </div>
  );
};
