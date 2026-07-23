import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { CourseCompleted } from "@/components/course-player/course-completed";
import { CourseLoadingCard } from "@/components/course-loading-card";
import { Card, CardContent } from "@/components/ui/card";
import type { CourseLesson } from "@/lib/course-package";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { buildLessonPath } from "@/lib/course-utils";
import { useAppState } from "@/lib/use-app-state";

type CoursePlayerShellProps = {
  children: (context: {
    activeLesson: CourseLesson;
    courseTitle: string;
    exitPlayer: () => void;
    progressCurrent: number;
    progressTotal: number;
    moveToNextLesson: () => void;
    sectionTitle: string;
  }) => ReactNode;
  courseId: string;
  lessonId: string;
};

export function CoursePlayerShell({
  children,
  courseId,
  lessonId,
}: CoursePlayerShellProps) {
  const navigate = useNavigate();
  const { locale } = useAppState();
  const { t } = useTranslation();
  const [isCourseComplete, setIsCourseComplete] = useState(false);
  const { data: course, isLoading } = useCourseDetailsQuery(courseId, locale, {
    throwOnError: true,
  });

  const lessonSequence = useMemo(() => {
    if (!course) {
      return [];
    }

    return course.sections.flatMap((section) =>
      section.lessons.map((lesson) => ({
        lesson,
        sectionTitle: section.title,
      })),
    );
  }, [course]);

  const activeLessonIndex = lessonSequence.findIndex(
    (entry) => entry.lesson.id === lessonId,
  );
  const activeLessonEntry =
    activeLessonIndex >= 0 ? lessonSequence[activeLessonIndex] : null;
  const activeLesson = activeLessonEntry?.lesson ?? null;

  useEffect(() => {
    setIsCourseComplete(false);
  }, [courseId, lessonId, locale]);

  function moveToNextLesson() {
    if (activeLessonIndex + 1 >= lessonSequence.length) {
      setIsCourseComplete(true);
      return;
    }

    const nextLesson = lessonSequence[activeLessonIndex + 1]?.lesson;

    if (!nextLesson) {
      return;
    }

    navigate(buildLessonPath(courseId, nextLesson.id));
  }

  if (course && lessonSequence.length > 0 && !activeLesson) {
    const entrySection = course.sections.find(
      (section) => section.id === course.entrySectionId,
    );
    const fallbackLessonId =
      entrySection?.lessons[0]?.id ??
      course.sections[0]?.lessons[0]?.id ??
      null;

    if (fallbackLessonId) {
      return (
        <Navigate replace to={buildLessonPath(courseId, fallbackLessonId)} />
      );
    }
  }

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

  if (isCourseComplete) {
    return <CourseCompleted onExitPlayer={() => navigate(`/courses/${courseId}`)} />;
  }

  if (!activeLesson || !activeLessonEntry) {
    return null;
  }

  function exitPlayer() {
    navigate(`/courses/${courseId}`);
  }

  return (
    children({
      activeLesson,
      courseTitle: course.title,
      exitPlayer,
      progressCurrent: activeLessonIndex + 1,
      progressTotal: lessonSequence.length,
      moveToNextLesson,
      sectionTitle: activeLessonEntry.sectionTitle,
    })
  );
}
