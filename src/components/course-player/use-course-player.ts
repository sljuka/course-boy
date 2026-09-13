import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { CourseLesson } from "@/lib/course-package";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { buildLessonPath } from "@/lib/course-utils";
import { useAppState } from "@/lib/use-app-state";

export type CoursePlayerReadyState = {
  activeLesson: CourseLesson;
  courseId: string;
  courseTitle: string;
  exitPlayer: () => void;
  moveToNextLesson: () => void;
  progressCurrent: number;
  progressTotal: number;
  sectionTitle: string;
  status: "ready";
};

export type CoursePlayerState =
  | CoursePlayerReadyState
  | {
      status: "complete";
      onExitPlayer: () => void;
    }
  | {
      status: "loading";
    }
  | {
      status: "missing";
    }
  | {
      status: "redirect";
      to: string;
    };

export function useCoursePlayer({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}): CoursePlayerState {
  const navigate = useNavigate();
  const { locale } = useAppState();
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

  function exitPlayer() {
    navigate(`/courses/${courseId}`);
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
      return {
        status: "redirect",
        to: buildLessonPath(courseId, fallbackLessonId),
      };
    }
  }

  if (isLoading) {
    return { status: "loading" };
  }

  if (!course) {
    return { status: "missing" };
  }

  if (isCourseComplete) {
    return {
      status: "complete",
      onExitPlayer: exitPlayer,
    };
  }

  if (!activeLesson || !activeLessonEntry) {
    return { status: "missing" };
  }

  return {
    activeLesson,
    courseId,
    courseTitle: course.title,
    exitPlayer,
    moveToNextLesson,
    progressCurrent: activeLessonIndex + 1,
    progressTotal: lessonSequence.length,
    sectionTitle: activeLessonEntry.sectionTitle,
    status: "ready",
  };
}
