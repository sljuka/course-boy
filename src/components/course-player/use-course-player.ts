import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { CourseLesson, CourseSectionTest } from "@/lib/course-package";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { buildLessonPath, buildLessonTestPath } from "@/lib/course-utils";
import { useAppState } from "@/lib/use-app-state";

// A step in the player's overall sequence is either a document (a lesson,
// which may itself carry an attached test reached via its own "Continue"
// button) or a standalone test with no document at all — see CourseSectionTest.
export type CoursePlayerStep =
  | { item: CourseLesson; kind: "lesson" }
  | { item: CourseSectionTest; kind: "test" };

export type CoursePlayerReadyState = {
  activeStep: CoursePlayerStep;
  courseId: string;
  courseTitle: string;
  exitPlayer: () => void;
  moveToNextStep: () => void;
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

  const stepSequence = useMemo(() => {
    if (!course) {
      return [];
    }

    return course.sections.flatMap((section) => [
      ...section.lessons.map(
        (lesson) =>
          ({ item: lesson, kind: "lesson", sectionTitle: section.title }) as const,
      ),
      ...section.tests.map(
        (sectionTest) =>
          ({ item: sectionTest, kind: "test", sectionTitle: section.title }) as const,
      ),
    ]);
  }, [course]);

  const activeStepIndex = stepSequence.findIndex(
    (entry) => entry.item.id === lessonId,
  );
  const activeStepEntry =
    activeStepIndex >= 0 ? stepSequence[activeStepIndex] : null;

  useEffect(() => {
    setIsCourseComplete(false);
  }, [courseId, lessonId, locale]);

  function pathForStep(step: CoursePlayerStep) {
    return step.kind === "lesson"
      ? buildLessonPath(courseId, step.item.id)
      : buildLessonTestPath(courseId, step.item.id);
  }

  function moveToNextStep() {
    if (activeStepIndex + 1 >= stepSequence.length) {
      setIsCourseComplete(true);
      return;
    }

    const nextEntry = stepSequence[activeStepIndex + 1];

    if (!nextEntry) {
      return;
    }

    navigate(pathForStep(nextEntry));
  }

  function exitPlayer() {
    navigate(`/courses/${courseId}`);
  }

  if (course && stepSequence.length > 0 && !activeStepEntry) {
    const entrySection = course.sections.find(
      (section) => section.id === course.entrySectionId,
    );
    const fallbackStep =
      entrySection?.lessons[0] ??
      entrySection?.tests[0] ??
      course.sections[0]?.lessons[0] ??
      course.sections[0]?.tests[0] ??
      null;

    if (fallbackStep) {
      const isLesson = "body" in fallbackStep;

      return {
        status: "redirect",
        to: isLesson
          ? buildLessonPath(courseId, fallbackStep.id)
          : buildLessonTestPath(courseId, fallbackStep.id),
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

  if (!activeStepEntry) {
    return { status: "missing" };
  }

  return {
    activeStep: activeStepEntry,
    courseId,
    courseTitle: course.title,
    exitPlayer,
    moveToNextStep,
    progressCurrent: activeStepIndex + 1,
    progressTotal: stepSequence.length,
    sectionTitle: activeStepEntry.sectionTitle,
    status: "ready",
  };
}
