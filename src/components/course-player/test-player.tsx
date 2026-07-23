import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { CoursePlayerShell } from "@/components/course-player/course-player-shell";
import { CourseTestContent } from "@/components/course-player/course-test-content";
import { PageHeader } from "@/components/page-header";
import { CardDescription, LessonTitle } from "@/components/ui/card";
import type { CourseExercise } from "@/lib/course-package";
import {
  buildExerciseInstance,
  buildTestExerciseSequence,
  roundToPrecision,
  type ExerciseInstance,
} from "@/lib/course-player-utils";
import { buildLessonPath } from "@/lib/course-utils";

type ExerciseResult = {
  feedback: string | null;
  isCorrect: boolean;
};

export function TestPlayer({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  return (
    <CoursePlayerShell courseId={courseId} lessonId={lessonId}>
      {({
        activeLesson,
        courseTitle,
        moveToNextLesson,
        progressCurrent,
        progressTotal,
        sectionTitle,
      }) => (
        <ResolvedTestPlayer
          activeLesson={activeLesson}
          courseId={courseId}
          courseTitle={courseTitle}
          moveToNextLesson={moveToNextLesson}
          progressCurrent={progressCurrent}
          progressTotal={progressTotal}
          sectionTitle={sectionTitle}
        />
      )}
    </CoursePlayerShell>
  );
}

function ResolvedTestPlayer({
  activeLesson,
  courseId,
  courseTitle,
  moveToNextLesson,
  progressCurrent,
  progressTotal,
  sectionTitle,
}: {
  activeLesson: {
    body: string;
    description: string;
    iconUrl: string | null;
    id: string;
    test: {
      exercises: CourseExercise[];
      id: string;
      structure?: { count: number; tag: string }[];
    } | null;
    title: string;
  };
  courseId: string;
  courseTitle: string;
  moveToNextLesson: () => void;
  progressCurrent: number;
  progressTotal: number;
  sectionTitle: string;
}) {
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

  function resetExerciseState() {
    setActiveTestExercises([]);
    setActiveTestInstances([]);
    setExerciseAnswers([]);
    setExerciseResults([]);
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  useEffect(() => {
    resetExerciseState();

    if (!activeLesson.test || activeLesson.test.exercises.length === 0) {
      return;
    }

    const selectedExercises = buildTestExerciseSequence(activeLesson);

    if (selectedExercises.length === 0) {
      return;
    }

    setActiveTestExercises(selectedExercises);
    setActiveTestInstances(
      selectedExercises.map((exercise) => buildExerciseInstance(exercise)),
    );
    setExerciseAnswers(selectedExercises.map(() => ""));
    setExerciseResults(
      selectedExercises.map(() => ({
        feedback: null,
        isCorrect: false,
      })),
    );
  }, [activeLesson]);

  if (!activeLesson.test || activeLesson.test.exercises.length === 0) {
    return <Navigate replace to={buildLessonPath(courseId, activeLesson.id)} />;
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
          ? t("courseDetails.incorrectAnswerWithHint", {
              hint: exercise.hint,
            })
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

  return (
    <>
      <PageHeader
        title={<LessonTitle>{courseTitle}</LessonTitle>}
        subtitle={
          <CardDescription className="text-base text-stone-600">
            {sectionTitle}
            {" · "}
            {t("courseDetails.progress", {
              current: progressCurrent,
              total: progressTotal,
            })}
          </CardDescription>
        }
        right={
          <CoursePlayerActions
            courseId={courseId}
            isRefreshingAvailable={activeTestExercises.length > 0}
            onPrintCourse={() => window.print()}
            onRefreshExercise={() => {
              if (activeTestExercises.length === 0) {
                return;
              }

              setActiveTestInstances(
                activeTestExercises.map((exercise) =>
                  buildExerciseInstance(exercise),
                ),
              );
              setExerciseAnswers(activeTestExercises.map(() => ""));
              setExerciseResults(
                activeTestExercises.map(() => ({
                  feedback: null,
                  isCorrect: false,
                })),
              );
              setTestFeedback(null);
              setIsTestPassed(false);
            }}
          />
        }
      />
      <CourseTestContent
        activeTestExercises={activeTestExercises}
        activeTestInstances={activeTestInstances}
        exerciseAnswers={exerciseAnswers}
        exerciseResults={exerciseResults}
        isTestPassed={isTestPassed}
        onContinueAfterExercise={moveToNextLesson}
        onSubmitExercise={submitExercise}
        onUpdateExerciseAnswer={updateExerciseAnswer}
        testFeedback={testFeedback}
      />
    </>
  );
}
