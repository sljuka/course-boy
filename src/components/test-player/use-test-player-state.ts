import { useEffect, useRef, useState } from "react";
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
  // False when nothing was given (graded "not answered"): not a try.
  isAnswered: boolean;
  isCorrect: boolean;
  // How much of it is right, 0 to 1: partial credit in a graded test.
  share: number;
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
    return { feedback: null, hint: null, isAnswered: true, isCorrect: true, share: 1 };
  }

  if (!result.isAnswered) {
    return { feedback: t(result.noAnswerMessageKey), hint: null, isAnswered: false, isCorrect: false, share: 0 };
  }

  return {
    feedback: exercise.hint
      ? t("courseDetails.incorrectAnswerWithHint", { hint: exercise.hint })
      : t("courseDetails.incorrectAnswer"),
    hint: exercise.hint ?? null,
    isAnswered: true,
    isCorrect: false,
    share: result.share ?? 0,
  };
}

const NO_TESTS: CourseTest[] = [];

function createEmptyResults(exercises: CourseExercise[]): ExerciseResult[] {
  return exercises.map(() => ({
    feedback: null,
    hint: null,
    isAnswered: false,
    isCorrect: false,
    share: 0,
  }));
}

// `startInteractive`: whether a test opens in interactive mode (SLJ-132; the
// person's setting in the test player, paper mode for the editors' examples).
// `onFirstTry`: each question's first try in interactive mode, right or not
// (the course's spree, SLJ-134). `courseTests`: every test in the course, for
// a final test's pool (SLJ-136).
export function useTestPlayerState(
  activeLesson?: { test: CourseTest | null },
  {
    courseTests = NO_TESTS,
    onFirstTry,
    startInteractive = false,
  }: { courseTests?: CourseTest[]; onFirstTry?: (isCorrect: boolean) => void; startInteractive?: boolean } = {},
) {
  // Read when exercises are picked, not watched: the course refreshing in
  // the background mustn't start a test over.
  const courseTestsRef = useRef(courseTests);
  useEffect(() => {
    courseTestsRef.current = courseTests;
  }, [courseTests]);
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

    // A final test (SLJ-136) can have no exercises of its own: what's
    // picked decides.
    if (!activeLesson?.test) {
      return;
    }

    const selectedExercises = buildTestExerciseSequence(activeLesson, courseTestsRef.current);

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
        resultIndex === index ? { feedback: null, hint: null, isAnswered: false, isCorrect: false, share: 0 } : result,
      ),
    );
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  // A graded test (SLJ-135) grades nothing while it's taken: this grades
  // every answer as it stands, for "Finish test", without showing anything.
  function gradeAll(): ExerciseResult[] {
    return activeTestExercises.map((exercise, index) =>
      deriveExerciseResult(exercise, activeTestInstances[index], exerciseAnswers[index] ?? "", t),
    );
  }

  // Try again: a new attempt, with a new pick of exercises (if the test picks
  // them at random) and new numbers.
  function restart() {
    resetExerciseState();
    const selectedExercises = activeLesson ? buildTestExerciseSequence(activeLesson, courseTestsRef.current) : [];
    if (selectedExercises.length > 0) hydrateExercises(selectedExercises);
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

    // "Check answer" with nothing given (a stray Enter) isn't a try: it
    // shows "not answered" but neither counts as wrong nor ends a spree.
    if (result.isAnswered) {
      if (firstTryCorrect[index] === null) onFirstTry?.(result.isCorrect);
      recordFirstTries([{ index, isCorrect: result.isCorrect }]);
    }
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
    gradeAll,
    isInteractiveMode,
    isPrintHintVisible,
    isTestPassed,
    refreshExercises,
    restart,
    setIsInteractiveMode,
    setIsPrintHintVisible,
    submitExercise,
    submitSingleExercise,
    testFeedback,
    updateExerciseAnswer,
  };
}
