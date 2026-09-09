import type { ExerciseKind } from "../course-package";

import { multipleChoiceExerciseRuntime } from "./multiple-choice";
import { numericExerciseRuntime } from "./numeric";
import type { ExerciseKindRuntime } from "./types";
import { wordTypesExerciseRuntime } from "./word-types";

/**
 * Every exercise kind's pure runtime logic, keyed by `kind`. `Record<ExerciseKind, ...>`
 * (not an array + `.find`) means adding a kind to the `ExerciseKind` union without
 * registering it here is a compile error, not a silent runtime fallthrough — see
 * "Adding an exercise kind" in docs/contracts.md.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry necessarily erases each kind's concrete shared/course type
const EXERCISE_KIND_RUNTIMES: Record<ExerciseKind, ExerciseKindRuntime<any, any>> = {
  "multiple-choice": multipleChoiceExerciseRuntime,
  numeric: numericExerciseRuntime,
  "word-types": wordTypesExerciseRuntime,
};

export function isExerciseKind(value: unknown): value is ExerciseKind {
  return typeof value === "string" && value in EXERCISE_KIND_RUNTIMES;
}

/**
 * A test file written before multiple-choice existed has no `kind` field at all —
 * treated as `"numeric"` here, at read time, rather than migrating every existing
 * `test-XX-*.json` file on disk. Returns `null` for a genuinely unrecognized kind
 * (as opposed to a missing one) so callers can reject it instead of silently
 * mis-handling it as numeric.
 */
export function normalizeExerciseKind(rawKind: unknown): ExerciseKind | null {
  if (rawKind === undefined) {
    return "numeric";
  }

  return isExerciseKind(rawKind) ? rawKind : null;
}

export function getExerciseKindRuntime(kind: ExerciseKind) {
  return EXERCISE_KIND_RUNTIMES[kind];
}
