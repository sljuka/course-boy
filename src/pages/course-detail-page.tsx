import { ArrowLeft, BookOpen } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { buttonVariants } from "@/components/ui/button";
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

  useEffect(() => {
    let isMounted = true;

    if (!courseId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
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
          <div className="px-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <CardTitle className="text-3xl">{course.title}</CardTitle>
              <span className="text-sm text-stone-500">
                {t("courseSearch.version", { version: course.version })}
              </span>
            </div>
            <CardDescription className="mt-3 max-w-3xl text-base text-stone-700">
              {course.description}
            </CardDescription>
          </div>
          <Card className="overflow-hidden">
          <CardContent className="space-y-5 pt-0">
            <div className="flex flex-wrap gap-3 text-sm text-stone-600">
              <span className="rounded-full border border-stone-300/80 bg-white/60 px-3 py-1">
                {course.id}
              </span>
              <span className="rounded-full border border-stone-300/80 bg-white/60 px-3 py-1">
                {course.courseType}
              </span>
            </div>
            <div>
              <h2 className="mb-4 text-lg font-semibold text-stone-900">
                {t("courseDetails.lessons")}
              </h2>
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
            </div>
          </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
