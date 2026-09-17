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

/**
 * A file written before multi-select existed stores a single
 * `correctOptionIndex: number` and no `selectionMode` — normalize that
 * legacy shape to one correct option, same "no field → treat as legacy"
 * pattern as `normalizeExerciseKind` in registry.ts. A missing
 * `selectionMode` on an otherwise-current file defaults to `"multiple"`
 * (checkboxes) rather than `"single"`, since checkboxes is the more general
 * mode and matches what an untouched "single answer" checkbox implies.
 */
export function normalizeMultipleChoiceCorrectOptions(
  raw: Record<string, unknown>,
): { correctOptionIndexes: number[]; selectionMode: "single" | "multiple" } | null {
  const selectionMode = raw.selectionMode === "single" ? "single" : "multiple";

  if (Array.isArray(raw.correctOptionIndexes)) {
    if (
      !raw.correctOptionIndexes.every(
        (index) => typeof index === "number" && Number.isInteger(index) && index >= 0,
      )
    ) {
      return null;
    }

    return { correctOptionIndexes: raw.correctOptionIndexes as number[], selectionMode };
  }

  if (
    typeof raw.correctOptionIndex === "number" &&
    Number.isInteger(raw.correctOptionIndex) &&
    raw.correctOptionIndex >= 0
  ) {
    return { correctOptionIndexes: [raw.correctOptionIndex], selectionMode };
  }

  return null;
}

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

  const normalized = normalizeMultipleChoiceCorrectOptions(exercise);

  if (!normalized) {
    return false;
  }

  if (normalized.selectionMode === "single" && normalized.correctOptionIndexes.length !== 1) {
    return false;
  }

  return localeEntries.every((metadata) =>
    normalized.correctOptionIndexes.every((index) => index < metadata.options.length),
  );
}

function resolveForPlayer(
  shared: SharedMultipleChoiceTestExerciseDefinition,
  context: ResolveForPlayerContext,
): MultipleChoiceCourseExercise {
  // `shared` may still be the on-disk legacy shape at runtime even though its
  // static type is the current one — normalize defensively.
  const normalized = normalizeMultipleChoiceCorrectOptions(shared) ?? {
    correctOptionIndexes: [],
    selectionMode: "multiple" as const,
  };

  return {
    correctOptionIndexes: normalized.correctOptionIndexes,
    hint: context.hint,
    id: context.id,
    kind: "multiple-choice",
    options:
      context.requestedLocales
        .map((locale) => shared.locales[locale]?.options)
        .find((options) => Array.isArray(options)) ?? [],
    prompt: context.prompt,
    selectionMode: normalized.selectionMode,
    tags: shared.tags,
  };
}

export function encodeMultipleChoiceSelection(selectedIndexes: number[]): string {
  return JSON.stringify(selectedIndexes);
}

export function decodeMultipleChoiceSelection(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "number")) {
      return parsed;
    }
  } catch {
    // fall through to the empty default below
  }

  return [];
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
  const selectedIndexes = decodeMultipleChoiceSelection(rawAnswer);

  if (selectedIndexes.length === 0) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.selectAnAnswer" };
  }

  const correctSet = new Set(exercise.correctOptionIndexes);
  const selectedSet = new Set(selectedIndexes);
  const isCorrect =
    correctSet.size === selectedSet.size &&
    [...correctSet].every((index) => selectedSet.has(index));

  if (isCorrect) {
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
