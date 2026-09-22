import { useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { CourseExercise, CourseTest } from "@/lib/course-package";
import {
  buildExerciseInstance,
  buildTestExerciseSequence,
  type ExerciseInstance,
} from "@/lib/course-player-utils";
import { getExerciseKindRuntime } from "@/lib/exercise-kinds/registry";

export type ExerciseResult = {
  feedback: string | null;
  isCorrect: boolean;
};

function deriveExerciseResult(
  exercise: CourseExercise,
  instance: ExerciseInstance,
  rawAnswer: string,
  t: TFunction,
): ExerciseResult {
  const result = getExerciseKindRuntime(exercise.kind).grade(exercise, instance, rawAnswer);

  if (result.isCorrect) {
    return { feedback: null, isCorrect: true };
  }

  if (!result.isAnswered) {
    return { feedback: t(result.noAnswerMessageKey), isCorrect: false };
  }

  return {
    feedback: exercise.hint
      ? t("courseDetails.incorrectAnswerWithHint", { hint: exercise.hint })
      : t("courseDetails.incorrectAnswer"),
    isCorrect: false,
  };
}

function createEmptyResults(exercises: CourseExercise[]) {
  return exercises.map(() => ({
    feedback: null,
    isCorrect: false,
  }));
}

export function useTestPlayerState(activeLesson?: { test: CourseTest | null }) {
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
  const [isPrintHintVisible, setIsPrintHintVisible] = useState(true);
  const [isInteractiveHintVisible, setIsInteractiveHintVisible] =
    useState(true);
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);

  function resetExerciseState() {
    setActiveTestExercises([]);
    setActiveTestInstances([]);
    setExerciseAnswers([]);
    setExerciseResults([]);
    setTestFeedback(null);
    setIsTestPassed(false);
    setIsInteractiveMode(false);
  }

  function hydrateExercises(exercises: CourseExercise[]) {
    setActiveTestExercises(exercises);
    setActiveTestInstances(
      exercises.map((exercise) => buildExerciseInstance(exercise)),
    );
    setExerciseAnswers(exercises.map(() => ""));
    setExerciseResults(createEmptyResults(exercises));
  }

  useEffect(() => {
    resetExerciseState();
    setIsPrintHintVisible(true);
    setIsInteractiveHintVisible(true);

    if (!activeLesson?.test || activeLesson.test.exercises.length === 0) {
      return;
    }

    const selectedExercises = buildTestExerciseSequence(activeLesson);

    if (selectedExercises.length === 0) {
      return;
    }

    hydrateExercises(selectedExercises);
  }, [activeLesson]);

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

  function refreshExercises() {
    if (activeTestExercises.length === 0) {
      return;
    }

    hydrateExercises(activeTestExercises);
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  function submitExercise() {
    if (activeTestExercises.length === 0 || activeTestInstances.length === 0) {
      return;
    }

    const nextResults = activeTestExercises.map((exercise, index) =>
      deriveExerciseResult(exercise, activeTestInstances[index], exerciseAnswers[index] ?? "", t),
    );
    const allCorrect = nextResults.every((result) => result.isCorrect);

    setExerciseResults(nextResults);
    setIsTestPassed(allCorrect);
    setTestFeedback(
      allCorrect
        ? t("courseDetails.correctAnswer")
        : t("courseDetails.incorrectAnswer"),
    );
  }

  // Grades a single exercise for interactive mode, leaving every other
  // exercise's result untouched — unlike `submitExercise`, this never writes
  // a whole-test "incorrect" banner, since interactive mode shows its own
  // per-exercise feedback instead. The whole-test passed state still gets
  // set once every exercise (across however many separate calls to this
  // function it took) ends up correct, so finishing the walkthrough
  // satisfies the exact same `isTestPassed` condition the all-at-once view
  // gates "Continue" on.
  function submitSingleExercise(index: number) {
    const exercise = activeTestExercises[index];
    const instance = activeTestInstances[index];

    if (!exercise || !instance) {
      return;
    }

    const result = deriveExerciseResult(exercise, instance, exerciseAnswers[index] ?? "", t);

    setExerciseResults((currentResults) => {
      const nextResults = currentResults.map((currentResult, resultIndex) =>
        resultIndex === index ? result : currentResult,
      );
      const allCorrect =
        nextResults.length > 0 && nextResults.every((nextResult) => nextResult.isCorrect);

      setIsTestPassed(allCorrect);
      setTestFeedback(allCorrect ? t("courseDetails.correctAnswer") : null);

      return nextResults;
    });
  }

  return {
    activeTestExercises,
    activeTestInstances,
    exerciseAnswers,
    exerciseResults,
    isInteractiveHintVisible,
    isInteractiveMode,
    isPrintHintVisible,
    isTestPassed,
    refreshExercises,
    setIsInteractiveHintVisible,
    setIsInteractiveMode,
    setIsPrintHintVisible,
    submitExercise,
    submitSingleExercise,
    testFeedback,
    updateExerciseAnswer,
  };
}
