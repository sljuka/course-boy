import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Star } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import {
  buildSectionPreviewItems,
  CoursePreviewStrip,
  type CoursePreviewStripItem,
} from "@/components/course-preview-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import type { CourseDetails } from "@/lib/course-package";
import { useAppState } from "@/lib/use-app-state";

export const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
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

  function handlePreviewItemSelect(item: CoursePreviewStripItem) {
    const targetLessonId = item.targetLessonId ?? item.id;
    const searchParams = new URLSearchParams({ lesson: targetLessonId });

    if (item.kind === "test") {
      searchParams.set("step", "test");
      navigate(`/courses/${courseId}/learn?${searchParams.toString()}`);
      return;
    }

    navigate(`/courses/${courseId}/learn?${searchParams.toString()}`);
  }

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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <CardTitle className="text-3xl">{course.title}</CardTitle>
                <Badge className="font-normal" variant="secondary">
                  {t("courseSearch.version", { version: course.version })}
                </Badge>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <Button
                  onClick={() => navigate(`/courses/${courseId}/learn`)}
                  size="sm"
                  variant="default"
                >
                  {t("courseDetails.startCourse")}
                </Button>
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
                    <CoursePreviewStrip
                      items={buildSectionPreviewItems(section.lessons)}
                      onSelect={handlePreviewItemSelect}
                    />
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
