import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { CourseContent } from "@/components/course-player/course-content";
import { CourseLoadingCard } from "@/components/course-loading-card";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  LessonTitle,
} from "@/components/ui/card";
import type { CourseExercise, CourseLesson } from "@/lib/course-package";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import {
  buildExerciseInstance,
  buildTestExerciseSequence,
  roundToPrecision,
  type ExerciseInstance,
} from "@/lib/course-player-utils";
import { buildLessonPath, buildLessonTestPath } from "@/lib/course-utils";
import { useAppState } from "@/lib/use-app-state";

type ExerciseResult = {
  feedback: string | null;
  isCorrect: boolean;
};

export const CoursePlayer = ({
  courseId,
  isTestRoute,
  lessonId,
}: {
  courseId: string;
  isTestRoute: boolean;
  lessonId: string;
}) => {
  const navigate = useNavigate();
  const { locale } = useAppState();
  const { t } = useTranslation();
  const [activeTestExercises, setActiveTestExercises] = useState<
    CourseExercise[]
  >([]);
  const [activeTestInstances, setActiveTestInstances] = useState<
    ExerciseInstance[]
  >([]);
  const [exerciseAnswers, setExerciseAnswers] = useState<string[]>([]);
  const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([]);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [isTestPassed, setIsTestPassed] = useState(false);
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
        sectionId: section.id,
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
    setActiveTestExercises([]);
    setActiveTestInstances([]);
    setExerciseAnswers([]);
    setExerciseResults([]);
    setTestFeedback(null);
    setIsTestPassed(false);
    setIsCourseComplete(false);
  }, [courseId, isTestRoute, lessonId, locale]);

  function resetExerciseState() {
    setActiveTestExercises([]);
    setActiveTestInstances([]);
    setExerciseAnswers([]);
    setExerciseResults([]);
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  function startLessonTest(lesson: CourseLesson) {
    if (!lesson.test || lesson.test.exercises.length === 0) {
      return;
    }

    const selectedExercises = buildTestExerciseSequence(lesson);

    if (selectedExercises.length === 0) {
      return;
    }

    setActiveTestExercises(selectedExercises);
    setActiveTestInstances(
      selectedExercises.map((exercise) => buildExerciseInstance(exercise)),
    );
    setExerciseAnswers(selectedExercises.map(() => ""));
    setExerciseResults(
      selectedExercises.map(() => ({ feedback: null, isCorrect: false })),
    );
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  useEffect(() => {
    if (!isTestRoute || !activeLesson) {
      return;
    }

    startLessonTest(activeLesson);
  }, [activeLesson, isTestRoute]);

  function moveToNextLesson() {
    if (activeLessonIndex + 1 >= lessonSequence.length) {
      resetExerciseState();
      setIsCourseComplete(true);
      return;
    }

    resetExerciseState();
    const nextLesson = lessonSequence[activeLessonIndex + 1]?.lesson;

    if (!nextLesson) {
      return;
    }

    navigate(buildLessonPath(courseId, nextLesson.id));
  }

  function continueFromLesson(lesson: CourseLesson | null) {
    if (!lesson) {
      return;
    }

    if (!lesson.test || lesson.test.exercises.length === 0) {
      moveToNextLesson();
      return;
    }

    navigate(buildLessonTestPath(courseId, lesson.id));
  }

  function refreshExercise() {
    if (!isTestRoute || activeTestExercises.length === 0) {
      return;
    }

    setActiveTestInstances(
      activeTestExercises.map((exercise) => buildExerciseInstance(exercise)),
    );
    setExerciseAnswers(activeTestExercises.map(() => ""));
    setExerciseResults(
      activeTestExercises.map(() => ({ feedback: null, isCorrect: false })),
    );
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  function updateExerciseAnswer(index: number, value: string) {
    setExerciseAnswers((currentAnswers) =>
      currentAnswers.map((answer, answerIndex) =>
        answerIndex === index ? value : answer,
      ),
    );
    setExerciseResults((currentResults) =>
      currentResults.map((result, resultIndex) =>
        resultIndex === index ? { feedback: null, isCorrect: false } : result,
      ),
    );
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  function submitExercise() {
    if (activeTestExercises.length === 0 || activeTestInstances.length === 0) {
      return;
    }

    let allCorrect = true;
    const nextResults = activeTestExercises.map((exercise, index) => {
      const normalizedAnswer = (exerciseAnswers[index] ?? "").trim();

      if (!normalizedAnswer) {
        allCorrect = false;
        return {
          feedback: t("courseDetails.enterAnswer"),
          isCorrect: false,
        };
      }

      const parsedAnswer = Number(normalizedAnswer.replace(",", "."));

      if (Number.isNaN(parsedAnswer)) {
        allCorrect = false;
        return {
          feedback: t("courseDetails.enterAnswer"),
          isCorrect: false,
        };
      }

      const roundedAnswer = roundToPrecision(parsedAnswer, exercise.precision);

      if (roundedAnswer === activeTestInstances[index]?.expectedAnswer) {
        return {
          feedback: null,
          isCorrect: true,
        };
      }

      allCorrect = false;
      return {
        feedback: exercise.hint
          ? t("courseDetails.incorrectAnswerWithHint", { hint: exercise.hint })
          : t("courseDetails.incorrectAnswer"),
        isCorrect: false,
      };
    });

    setExerciseResults(nextResults);
    setIsTestPassed(allCorrect);
    setTestFeedback(
      allCorrect
        ? t("courseDetails.correctAnswer")
        : t("courseDetails.incorrectAnswer"),
    );
  }

  function continueAfterExercise() {
    moveToNextLesson();
  }

  function printCourse() {
    window.print();
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
      return (
        <Navigate replace to={buildLessonPath(courseId, fallbackLessonId)} />
      );
    }
  }

  if (
    course &&
    activeLesson &&
    isTestRoute &&
    (!activeLesson.test || activeLesson.test.exercises.length === 0)
  ) {
    return <Navigate replace to={buildLessonPath(courseId, activeLesson.id)} />;
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

  return (
    <>
      <PageHeader
        title={<LessonTitle>{course.title}</LessonTitle>}
        subtitle={
          activeLessonEntry && (
            <CardDescription className="text-base text-stone-600">
              {activeLessonEntry.sectionTitle}
              {" · "}
              {t("courseDetails.progress", {
                current: activeLessonIndex + 1,
                total: lessonSequence.length,
              })}
            </CardDescription>
          )
        }
        right={
          <CoursePlayerActions
            courseId={courseId}
            isRefreshingAvailable={activeTestExercises.length > 0 && isTestRoute}
            onPrintCourse={printCourse}
            onRefreshExercise={refreshExercise}
          />
        }
      />

      <CourseContent
        activeLesson={activeLesson}
        activeTestExercises={activeTestExercises}
        activeTestInstances={activeTestInstances}
        exerciseAnswers={exerciseAnswers}
        exerciseResults={exerciseResults}
        isCourseComplete={isCourseComplete}
        isTestPassed={isTestPassed}
        isTestRoute={isTestRoute}
        onContinueAfterExercise={continueAfterExercise}
        onContinueFromLesson={continueFromLesson}
        onExitPlayer={exitPlayer}
        onSubmitExercise={submitExercise}
        onUpdateExerciseAnswer={updateExerciseAnswer}
        testFeedback={testFeedback}
      />
    </>
  );
};
