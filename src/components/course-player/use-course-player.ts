import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { CourseLesson, CourseSectionTest } from "@/lib/course-package";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { buildLessonPath, buildLessonTestPath, introStepId } from "@/lib/course-utils";
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
  // True only for the draft editor's "Preview test" route (see
  // `DraftTestPreviewPage`) — lets `TestPlayerView` show a "Preview" badge
  // and skip the section/progress line, which is synthetic there (a single
  // fake "Preview" section, always "1 of 1").
  isPreview: boolean;
  // A section intro (SLJ-45): shown like a lesson, but not counted in the
  // progress ("Lesson 2 of 5") and labelled "Introduction" instead.
  isSectionIntro: boolean;
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
  const { t } = useTranslation();
  const { locale } = useAppState();
  const [isCourseComplete, setIsCourseComplete] = useState(false);
  const { data: course, isLoading } = useCourseDetailsQuery(courseId, locale, {
    throwOnError: true,
  });

  const stepSequence = useMemo(() => {
    if (!course) {
      return [];
    }

    const introTitle = t("courseDetails.sectionIntro");

    return course.sections.flatMap((section) => [
      // The section intro (SLJ-45) first: shown like a lesson, with no test.
      ...(section.intro !== null
        ? [
            {
              item: {
                body: section.intro,
                description: "",
                iconUrl: null,
                id: introStepId(section.id),
                test: null,
                title: introTitle,
              } satisfies CourseLesson,
              isSectionIntro: true,
              kind: "lesson",
              sectionId: section.id,
              sectionTitle: section.title,
            } as const,
          ]
        : []),
      ...section.lessons.map(
        (lesson) =>
          ({ isSectionIntro: false, item: lesson, kind: "lesson", sectionId: section.id, sectionTitle: section.title }) as const,
      ),
      ...section.tests.map(
        (sectionTest) =>
          ({ isSectionIntro: false, item: sectionTest, kind: "test", sectionId: section.id, sectionTitle: section.title }) as const,
      ),
    ]);
  }, [course, t]);

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
    // An unknown step id: start at the entry section's first step (its intro,
    // when it has one).
    const fallbackStep =
      stepSequence.find((entry) => entry.sectionId === course.entrySectionId) ?? stepSequence[0];

    if (fallbackStep) {
      return { status: "redirect", to: pathForStep(fallbackStep) };
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

  // Intros aren't counted: progress is over lessons and tests.
  const countedSteps = stepSequence.filter((entry) => !entry.isSectionIntro);

  return {
    activeStep: activeStepEntry,
    courseId,
    courseTitle: course.title,
    exitPlayer,
    isPreview: false,
    isSectionIntro: activeStepEntry.isSectionIntro,
    moveToNextStep,
    progressCurrent: countedSteps.findIndex((entry) => entry.item.id === activeStepEntry.item.id) + 1,
    progressTotal: countedSteps.length,
    sectionTitle: activeStepEntry.sectionTitle,
    status: "ready",
  };
}
