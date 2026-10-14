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
  // The exercise's raw hint, only when this result is a wrong-but-answered
  // attempt on an exercise that actually has one — `feedback` already has it
  // baked in (for consumers like `CourseTestContent` that always show it),
  // but `InteractiveTestPlayer` uses this to gate it behind a "Show hint"
  // button instead of revealing it immediately.
  hint: string | null;
  isCorrect: boolean;
};

// Exported for reuse by the inline exercise block
// (`src/components/editor-prototype/exercise-block.tsx`), which grades a
// single exercise outside of any "test" wrapper.
export function deriveExerciseResult(
  exercise: CourseExercise,
  instance: ExerciseInstance,
  rawAnswer: string,
  t: TFunction,
): ExerciseResult {
  const result = getExerciseKindRuntime(exercise.kind).grade(exercise, instance, rawAnswer);

  if (result.isCorrect) {
    return { feedback: null, hint: null, isCorrect: true };
  }

  if (!result.isAnswered) {
    return { feedback: t(result.noAnswerMessageKey), hint: null, isCorrect: false };
  }

  return {
    feedback: exercise.hint
      ? t("courseDetails.incorrectAnswerWithHint", { hint: exercise.hint })
      : t("courseDetails.incorrectAnswer"),
    hint: exercise.hint ?? null,
    isCorrect: false,
  };
}

function createEmptyResults(exercises: CourseExercise[]) {
  return exercises.map(() => ({
    feedback: null,
    hint: null,
    isCorrect: false,
  }));
}

// `startInteractive`: whether a test opens in interactive mode (SLJ-132; the
// person's setting in the test player, paper mode for the editors' examples).
export function useTestPlayerState(
  activeLesson?: { test: CourseTest | null },
  { startInteractive = false }: { startInteractive?: boolean } = {},
) {
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
  // Each exercise's first graded answer: right, wrong, or not answered yet
  // (null). The score kept for the student (SLJ-50) counts first tries only;
  // a fresh set of exercises (Refresh) starts a new attempt.
  const [firstTryCorrect, setFirstTryCorrect] = useState<(boolean | null)[]>([]);
  const [isPrintHintVisible, setIsPrintHintVisible] = useState(true);
  const [isInteractiveMode, setIsInteractiveMode] = useState(startInteractive);

  function resetExerciseState() {
    setActiveTestExercises([]);
    setActiveTestInstances([]);
    setExerciseAnswers([]);
    setExerciseResults([]);
    setFirstTryCorrect([]);
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  function hydrateExercises(exercises: CourseExercise[]) {
    setActiveTestExercises(exercises);
    setActiveTestInstances(
      exercises.map((exercise) => buildExerciseInstance(exercise)),
    );
    setExerciseAnswers(exercises.map(() => ""));
    setExerciseResults(createEmptyResults(exercises));
    setFirstTryCorrect(exercises.map(() => null));
  }

  function recordFirstTries(results: { index: number; isCorrect: boolean }[]) {
    setFirstTryCorrect((current) =>
      current.map((firstTry, index) => firstTry ?? results.find((result) => result.index === index)?.isCorrect ?? null),
    );
  }

  useEffect(() => {
    resetExerciseState();
    setIsInteractiveMode(startInteractive);
    setIsPrintHintVisible(true);

    if (!activeLesson?.test || activeLesson.test.exercises.length === 0) {
      return;
    }

    const selectedExercises = buildTestExerciseSequence(activeLesson);

    if (selectedExercises.length === 0) {
      return;
    }

    hydrateExercises(selectedExercises);
  }, [activeLesson, startInteractive]);

  function updateExerciseAnswer(index: number, value: string) {
    setExerciseAnswers((currentAnswers) =>
      currentAnswers.map((answer, answerIndex) =>
        answerIndex === index ? value : answer,
      ),
    );
    setExerciseResults((currentResults) =>
      currentResults.map((result, resultIndex) =>
        resultIndex === index ? { feedback: null, hint: null, isCorrect: false } : result,
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

    recordFirstTries(nextResults.map((result, index) => ({ index, isCorrect: result.isCorrect })));
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

    recordFirstTries([{ index, isCorrect: result.isCorrect }]);
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
    firstTryCorrect,
    isInteractiveMode,
    isPrintHintVisible,
    isTestPassed,
    refreshExercises,
    setIsInteractiveMode,
    setIsPrintHintVisible,
    submitExercise,
    submitSingleExercise,
    testFeedback,
    updateExerciseAnswer,
  };
}
