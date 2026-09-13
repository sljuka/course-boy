import type { ExerciseKind } from "@/lib/course-package";

import { missingWordExerciseEditor } from "@/components/exercise-kinds/missing-word";
import { multipleChoiceExerciseEditor } from "@/components/exercise-kinds/multiple-choice";
import { numericExerciseEditor } from "@/components/exercise-kinds/numeric";
import type { ExerciseKindEditor } from "@/components/exercise-kinds/types";
import { wordTypesExerciseEditor } from "@/components/exercise-kinds/word-types";

/**
 * Every exercise kind's renderer-only editor (authoring fields, player
 * answer UI, persistence conversion), keyed by `kind`. Pairs with
 * `src/lib/exercise-kinds/registry.ts` — see "Adding an exercise kind" in
 * docs/contracts.md.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry necessarily erases each kind's concrete exercise/shared type
const EXERCISE_KIND_EDITORS: Record<ExerciseKind, ExerciseKindEditor<any, any, any>> = {
  "missing-word": missingWordExerciseEditor,
  "multiple-choice": multipleChoiceExerciseEditor,
  numeric: numericExerciseEditor,
  "word-types": wordTypesExerciseEditor,
};

export function getExerciseKindEditor(kind: ExerciseKind) {
  return EXERCISE_KIND_EDITORS[kind];
}

export function listExerciseKindEditors() {
  return Object.values(EXERCISE_KIND_EDITORS);
}
