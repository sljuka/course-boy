import type {
  MultipleChoiceCourseExercise,
  SharedMultipleChoiceTestExerciseDefinition,
} from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isLocale } from "../i18n";

import {
  hasValidTags,
  type ExerciseKindRuntime,
  type GradeResult,
  type ResolveForPlayerContext,
} from "./types";

function isValid(
  exercise: Record<string, unknown>,
): exercise is SharedMultipleChoiceTestExerciseDefinition {
  if (!hasValidTags(exercise)) {
    return false;
  }

  if (
    !exercise.locales ||
    typeof exercise.locales !== "object" ||
    !Object.entries(exercise.locales).every(([locale, metadata]) => {
      if (!isLocale(locale) || !metadata || typeof metadata !== "object") {
        return false;
      }

      const typedMetadata = metadata as {
        hint?: unknown;
        options?: unknown;
        prompt?: unknown;
      };

      return (
        typeof typedMetadata.prompt === "string" &&
        (typeof typedMetadata.hint === "undefined" ||
          typeof typedMetadata.hint === "string") &&
        Array.isArray(typedMetadata.options) &&
        typedMetadata.options.length >= 2 &&
        typedMetadata.options.every((option) => typeof option === "string")
      );
    })
  ) {
    return false;
  }

  const localeEntries = Object.values(
    exercise.locales as Record<string, { options: string[] }>,
  );

  return (
    typeof exercise.correctOptionIndex === "number" &&
    Number.isInteger(exercise.correctOptionIndex) &&
    exercise.correctOptionIndex >= 0 &&
    localeEntries.every(
      (metadata) => (exercise.correctOptionIndex as number) < metadata.options.length,
    )
  );
}

function resolveForPlayer(
  shared: SharedMultipleChoiceTestExerciseDefinition,
  context: ResolveForPlayerContext,
): MultipleChoiceCourseExercise {
  return {
    correctOptionIndex: shared.correctOptionIndex,
    hint: context.hint,
    id: context.id,
    kind: "multiple-choice",
    options:
      context.requestedLocales
        .map((locale) => shared.locales[locale]?.options)
        .find((options) => Array.isArray(options)) ?? [],
    prompt: context.prompt,
    tags: shared.tags,
  };
}

function shuffleIndexes(length: number): number[] {
  const order = Array.from({ length }, (_unused, index) => index);

  for (let currentIndex = order.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    const currentValue = order[currentIndex];
    order[currentIndex] = order[randomIndex];
    order[randomIndex] = currentValue;
  }

  return order;
}

function buildInstance(exercise: MultipleChoiceCourseExercise): ExerciseInstance {
  return {
    kind: "multiple-choice",
    optionOrder: shuffleIndexes(exercise.options.length),
  };
}

function grade(
  exercise: MultipleChoiceCourseExercise,
  _instance: ExerciseInstance,
  rawAnswer: string,
): GradeResult {
  const normalizedAnswer = rawAnswer.trim();

  if (!normalizedAnswer) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.selectAnAnswer" };
  }

  if (Number(normalizedAnswer) === exercise.correctOptionIndex) {
    return { isCorrect: true };
  }

  return { isAnswered: true, isCorrect: false };
}

export const multipleChoiceExerciseRuntime: ExerciseKindRuntime<
  SharedMultipleChoiceTestExerciseDefinition,
  MultipleChoiceCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "multiple-choice",
  resolveForPlayer,
};
