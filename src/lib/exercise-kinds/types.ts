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
  // The only kind-agnostic piece of course-scoped data any kind currently
  // needs — region-picker uses it to resolve its SVG asset's filename into a
  // full `matko-asset://` URL. See `resolveSharedTestForPlayer` in
  // registry.ts for where this comes from.
  courseId: string;
  hint?: string;
  id: string;
  prompt: string;
  requestedLocales: Locale[];
};

// `share`: for a wrong answer to an exercise with several parts (blanks,
// words, regions, several right options), how much of it is right, from 0 to
// below 1: what partial credit gives in a graded test (SLJ-135). Missing: none.
export type GradeResult =
  | { isCorrect: true }
  | { isCorrect: false; isAnswered: true; share?: number }
  | { isCorrect: false; isAnswered: false; noAnswerMessageKey: string };

// The share of parts right: each wrong pick (an option, shape or colour that
// isn't asked for) takes a right one away, so ticking everything earns
// nothing; never below 0.
export function partShare(right: number, wrong: number, total: number): number {
  return total > 0 ? Math.max(0, right - wrong) / total : 0;
}

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
