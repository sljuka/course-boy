import type { ExerciseKind, SharedTestExerciseDefinition } from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import type { Locale } from "../i18n";

/**
 * The locale-collapsing context every kind's `resolveForPlayer` needs.
 * `hint`/`prompt` are resolved once by the caller (every kind's shared
 * definition has them), so a kind implementation only resolves whatever
 * *additional* per-locale fields it declares itself (e.g. multiple-choice's
 * `options`, word-types' `text`).
 */
export type ResolveForPlayerContext = {
  answerPlaceholder?: string;
  hint?: string;
  id: string;
  prompt: string;
  requestedLocales: Locale[];
};

export type GradeResult =
  | { isCorrect: true }
  | { isCorrect: false; isAnswered: true }
  | { isCorrect: false; isAnswered: false; noAnswerMessageKey: string };

/**
 * The pure, portable half of an exercise kind — importable from both the
 * renderer and the Electron main process (same category as
 * `word-type-markup.ts`). No React, no filesystem. This is what
 * `electron/course-registry.ts`'s structural save-guard and read path, and
 * the player's instance-building/grading, dispatch through instead of a
 * hand-written `if/else` chain per kind.
 */
export type ExerciseKindRuntime<TShared extends SharedTestExerciseDefinition, TCourse> = {
  kind: ExerciseKind;
  isValid(exercise: Record<string, unknown>): exercise is TShared;
  resolveForPlayer(shared: TShared, context: ResolveForPlayerContext): TCourse;
  buildInstance(exercise: TCourse): ExerciseInstance;
  grade(exercise: TCourse, instance: ExerciseInstance, rawAnswer: string): GradeResult;
};

/** Tags are optional, but when present must be well-formed — shared by all `isValid`s. */
export function hasValidTags(exercise: Record<string, unknown>): boolean {
  return (
    Array.isArray(exercise.tags) &&
    exercise.tags.every((tag) => typeof tag === "string" && tag.length > 0)
  );
}
