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

export type FieldsComponentProps<TExercise extends TestExercise> = {
  // Only region-picker's fields need this today (to upload/render this
  // course's SVG asset), but every kind receives it uniformly rather than
  // making it kind-specific — see `ResolveForPlayerContext.courseId`.
  courseId: string;
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
  /** One sentence shown while choosing an exercise kind — see the "Add exercise" wizard in test-editor-prototype.tsx. */
  description: string;
  /**
   * A static, non-interactive rendering of what this kind looks like to a
   * student — shown under an "Example" label below `description` in the
   * "Add exercise" wizard's kind-choosing step. Optional: a kind with no
   * illustrative example yet simply shows no example section.
   */
  ExampleComponent?: ComponentType<Record<string, never>>;
  createExercise(locales: Locale[]): TExercise;
  validate(exercise: TExercise, locale: Locale): SolutionValidationResult;
  toShared(exercise: TExercise): TShared;
  fromShared(definition: TShared): TExercise;
  FieldsComponent: ComponentType<FieldsComponentProps<TExercise>>;
  AnswerComponent: ComponentType<AnswerComponentProps<TCourse>>;
  PrintAnswerComponent?: ComponentType<PrintAnswerComponentProps<TCourse>>;
};
