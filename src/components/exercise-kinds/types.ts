import type { ComponentType } from "react";

import type { SolutionValidationResult, TestExercise } from "@/components/test-editor-prototype-types";
import type { CourseExercise, ExerciseKind, SharedTestExerciseDefinition } from "@/lib/course-package";
import type { ExerciseInstance } from "@/lib/course-player-utils";
import { isLocale, type Locale } from "@/lib/i18n";
import type { CoursePrintAnswerStyle } from "@/lib/print-options";

/**
 * Every kind's on-disk shape stores per-locale content the same way — drop
 * any key that isn't a supported locale before persisting.
 */
export function filterValidLocaleEntries<T>(
  entries: Record<string, T>,
): Partial<Record<Locale, T>> {
  return Object.fromEntries(
    Object.entries(entries).filter(([locale]) => isLocale(locale)),
  ) as Partial<Record<Locale, T>>;
}

/**
 * The backend requires at least one tag on every exercise kind
 * (`hasValidTags` in `src/lib/exercise-kinds/types.ts`), but that guard only
 * runs at save time — every kind's `validate()` must surface it too, or the
 * UI can show "Valid" for an exercise that then fails to save with no
 * visible reason (exactly the bug this shared check exists to make
 * impossible to forget when adding a kind). Call this last, after any
 * kind-specific checks, so a more specific error still takes priority.
 */
export function validateHasTags(exercise: {
  tagIds: string[];
}): SolutionValidationResult | null {
  if (exercise.tagIds.length === 0) {
    return { message: "Add at least one tag", status: "error" };
  }

  return null;
}

export type FieldsComponentProps<TExercise extends TestExercise> = {
  exercise: TExercise;
  locale: Locale;
  onChange: (updater: (exercise: TExercise) => TExercise) => void;
};

export type AnswerComponentProps<TCourse extends CourseExercise> = {
  exercise: TCourse;
  index: number;
  instance: ExerciseInstance;
  onAnswerChange: (value: string) => void;
  value: string;
};

export type PrintAnswerComponentProps<TCourse extends CourseExercise> = {
  exercise: TCourse;
  printAnswerStyle: CoursePrintAnswerStyle;
};

/**
 * The renderer-only half of an exercise kind (React, authoring + player UI).
 * Pairs with `ExerciseKindRuntime` in `src/lib/exercise-kinds/` — split at the
 * process boundary CLAUDE.md already establishes (Electron main never sees
 * React). See "Adding an exercise kind" in docs/contracts.md.
 */
export type ExerciseKindEditor<
  TExercise extends TestExercise,
  TShared extends SharedTestExerciseDefinition,
  TCourse extends CourseExercise,
> = {
  kind: ExerciseKind;
  label: string;
  createExercise(locales: Locale[]): TExercise;
  validate(exercise: TExercise, locale: Locale): SolutionValidationResult;
  toShared(exercise: TExercise): TShared;
  fromShared(definition: TShared): TExercise;
  FieldsComponent: ComponentType<FieldsComponentProps<TExercise>>;
  AnswerComponent: ComponentType<AnswerComponentProps<TCourse>>;
  PrintAnswerComponent?: ComponentType<PrintAnswerComponentProps<TCourse>>;
};
