import type {
  CourseTest,
  ExerciseKind,
  SharedTestDefinition,
  SharedTestExerciseDefinition,
} from "../course-package";
import { resolveExerciseMediaForPlayer, type SharedExerciseMedia, supportsExerciseMedia } from "../exercise-media";
import type { Locale } from "../i18n";

import { missingWordExerciseRuntime } from "./missing-word";
import { multipleChoiceExerciseRuntime } from "./multiple-choice";
import { numericExerciseRuntime } from "./numeric";
import { regionLabelExerciseRuntime } from "./region-label";
import { regionMarkerExerciseRuntime } from "./region-marker";
import { regionPickerExerciseRuntime } from "./region-picker";
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
  "missing-word": missingWordExerciseRuntime,
  "multiple-choice": multipleChoiceExerciseRuntime,
  numeric: numericExerciseRuntime,
  "region-label": regionLabelExerciseRuntime,
  "region-marker": regionMarkerExerciseRuntime,
  "region-picker": regionPickerExerciseRuntime,
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

/**
 * The single-locale `CourseTest` shape the player needs, resolved from the
 * all-locales `SharedTestDefinition` on disk (or, for the draft editor's
 * "Preview test", one built in memory that was never written to disk).
 * Shared by `electron/course-registry.ts`'s real read path and the draft
 * editor's preview so both produce the exact same shape — see
 * "Previewing a draft test" in docs/persistence-notes.md.
 */
/**
 * The single-exercise half of `resolveSharedTestForPlayer` — also used
 * directly by the inline exercise block (`src/components/editor-prototype/`),
 * which resolves one exercise for the player without a wrapping test.
 */
export function resolveSharedExerciseForPlayer(
  exercise: SharedTestExerciseDefinition,
  id: string,
  requestedLocales: Locale[],
  courseId: string,
) {
  // The reader's language first, then the course's default. An empty text
  // counts as missing (not translated yet), so a student never gets a blank
  // prompt where another language has one.
  const firstWritten = (values: (string | undefined)[]) =>
    values.find((value) => typeof value === "string" && value.trim().length > 0);
  const hint = firstWritten(requestedLocales.map((locale) => exercise.locales[locale]?.hint));
  const prompt = firstWritten(requestedLocales.map((locale) => exercise.locales[locale]?.prompt)) ?? "";
  const answerPlaceholder = firstWritten(
    requestedLocales.map(
      (locale) =>
        (exercise.locales[locale] as { answerPlaceholder?: string } | undefined)?.answerPlaceholder,
    ),
  );
  const kind = normalizeExerciseKind(exercise.kind);

  if (!kind) {
    throw new Error(`Unresolvable exercise kind "${String(exercise.kind)}" in "${id}"`);
  }

  const resolved = getExerciseKindRuntime(kind).resolveForPlayer(exercise, {
    answerPlaceholder,
    courseId,
    hint,
    id,
    prompt,
    requestedLocales,
  });
  // Media is the same for every kind that has it, so it's resolved here
  // rather than by each kind (SLJ-56).
  const media = supportsExerciseMedia(kind)
    ? resolveExerciseMediaForPlayer(
        exercise as { locales: Partial<Record<Locale, { mediaAlt?: string }>>; media?: SharedExerciseMedia },
        requestedLocales,
        courseId,
      )
    : undefined;

  // Points too (SLJ-135): kept only when set, like the file.
  const points = (exercise as { points?: number }).points;
  const withPoints = typeof points === "number" ? { ...resolved, points } : resolved;

  return media ? { ...withPoints, media } : withPoints;
}

export function resolveSharedTestForPlayer(
  sharedTest: SharedTestDefinition,
  requestedLocales: Locale[],
  testId: string,
  courseId: string,
): CourseTest {
  return {
    exercises: sharedTest.exercises.map((exercise, index) =>
      resolveSharedExerciseForPlayer(
        exercise,
        `${testId}#${index + 1}`,
        requestedLocales,
        courseId,
      ),
    ),
    id: testId,
    graded: sharedTest.graded ?? false,
    ...(sharedTest.gradeBands ? { gradeBands: sharedTest.gradeBands } : {}),
    includeCourseExercises: sharedTest.includeCourseExercises ?? false,
    partialCredit: sharedTest.partialCredit ?? false,
    ...(sharedTest.showStartScreen !== undefined ? { showStartScreen: sharedTest.showStartScreen } : {}),
    ...(sharedTest.showSummary === false ? { showSummary: false } : {}),
    ...(sharedTest.exerciseCount ? { exerciseCount: sharedTest.exerciseCount } : {}),
    showMnemonics: sharedTest.showMnemonics ?? false,
    structure: sharedTest.structure,
  };
}
