import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CourseExercise, CourseLesson } from "@/lib/course-package";
import {
  buildExerciseInstance,
  buildTestExerciseSequence,
  roundToPrecision,
  type ExerciseInstance,
} from "@/lib/course-player-utils";

export type ExerciseResult = {
  feedback: string | null;
  isCorrect: boolean;
};

function createEmptyResults(exercises: CourseExercise[]) {
  return exercises.map(() => ({
    feedback: null,
    isCorrect: false,
  }));
}

export function useTestPlayerState(activeLesson?: CourseLesson) {
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

  function resetExerciseState() {
    setActiveTestExercises([]);
    setActiveTestInstances([]);
    setExerciseAnswers([]);
    setExerciseResults([]);
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

  return {
    activeTestExercises,
    activeTestInstances,
    exerciseAnswers,
    exerciseResults,
    isInteractiveHintVisible,
    isPrintHintVisible,
    isTestPassed,
    refreshExercises,
    setIsInteractiveHintVisible,
    setIsPrintHintVisible,
    submitExercise,
    testFeedback,
    updateExerciseAnswer,
  };
}
