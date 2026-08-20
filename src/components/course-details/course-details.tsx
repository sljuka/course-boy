import { useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { CourseLoadingCard } from "@/components/course-loading-card";
import {
  buildSectionPreviewItems,
  type CoursePreviewStripItem,
} from "@/components/course-preview-strip-items";
import {
  CoursePreviewStrip,
} from "@/components/course-preview-strip";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import {
  buildLessonPath,
  buildLessonTestPath,
  getEntryLessonId,
} from "@/lib/course-utils";
import { useAppState } from "@/lib/use-app-state";

export const CourseDetails = ({ courseId }: { courseId: string }) => {
  const navigate = useNavigate();
  const { locale } = useAppState();
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(false);
  const { data: course, isLoading } = useCourseDetailsQuery(courseId, locale, {
    throwOnError: true,
  });

  if (isLoading) {
    return <CourseLoadingCard message={t("courseDetails.loading")} />;
  }

  if (!course) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="py-10 text-sm text-stone-600">
          {t("courseDetails.missing")}
        </CardContent>
      </Card>
    );
  }

  const resolvedCourse = course;
  const entryLessonId = getEntryLessonId(resolvedCourse);

  function handlePreviewItemSelect(item: CoursePreviewStripItem) {
    const targetLessonId = item.targetLessonId ?? item.id;

    if (item.kind === "test") {
      navigate(buildLessonTestPath(courseId, targetLessonId));
      return;
    }

    navigate(buildLessonPath(courseId, targetLessonId));
  }

  function startCourse() {
    if (!entryLessonId) {
      return;
    }

    navigate(buildLessonPath(courseId, entryLessonId));
  }

  return (
    <>
      <PageHeader
        children={<></>}
        right={
          <>
            <Button disabled={!entryLessonId} onClick={startCourse} size="sm">
              {t("courseDetails.startCourse")}
            </Button>
            <Button
              aria-label={t(
                isFavorite ? "removeFavoriteCourse" : "favoriteCourse",
              )}
              className="rounded-full"
              onClick={() => setIsFavorite((currentValue) => !currentValue)}
              size="icon"
              variant={isFavorite ? "default" : "secondary"}
            >
              <Star
                aria-hidden="true"
                className={isFavorite ? "h-5 w-5 fill-current" : "h-5 w-5"}
              />
            </Button>
          </>
        }
        subtitle={
          <CardDescription className="max-w-3xl">
            {resolvedCourse.description}
          </CardDescription>
        }
        title={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <CardTitle size="lg">{resolvedCourse.title}</CardTitle>
            <Badge className="font-normal" variant="secondary">
              {t("courseSearch.version", { version: resolvedCourse.version })}
            </Badge>
          </div>
        }
        top={
          <div className="px-2">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
              to="/"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {t("courseDetails.back")}
            </Link>
          </div>
        }
      />
      {resolvedCourse.sections.map((section) => (
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
              {section.description && (
                <CardDescription className="text-sm text-stone-600">
                  {section.description}
                </CardDescription>
              )}
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
    </>
  );
};
