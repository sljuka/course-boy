import { getExerciseKindEditor } from "@/components/exercise-kinds/registry";
import type {
  BlueprintRule,
  TestEditorState,
  TestExercise,
} from "@/components/test-editor-prototype-types";
import type {
  CourseTestStructureRule,
  SharedTestDefinition,
  SharedTestExerciseDefinition,
} from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function toSharedTestExerciseDefinition(
  exercise: TestExercise,
): SharedTestExerciseDefinition {
  return getExerciseKindEditor(exercise.kind).toShared(exercise);
}

export function fromSharedTestExerciseDefinition(
  definition: SharedTestExerciseDefinition,
): TestExercise {
  // A test file written before multiple-choice/word-types existed has no
  // `kind` field at all — default it to "numeric", same as the backend's
  // read-time normalization in electron/course-registry.ts.
  const kind = definition.kind ?? "numeric";

  return getExerciseKindEditor(kind).fromShared(definition);
}

export function toSharedTestDefinition(testState: TestEditorState): SharedTestDefinition {
  const structure: CourseTestStructureRule[] | undefined = testState.useBlueprint
    ? testState.blueprint.map((rule) => ({ count: rule.count, tag: rule.tagId }))
    : undefined;

  return {
    exercises: testState.exercises.map(toSharedTestExerciseDefinition),
    template: testState.description,
    ...(structure ? { structure } : {}),
  };
}

export function fromSharedTestDefinition(
  definition: SharedTestDefinition,
  supportedLocales: Locale[],
): TestEditorState {
  const exercises = definition.exercises.map(fromSharedTestExerciseDefinition);
  const blueprint: BlueprintRule[] = (definition.structure ?? []).map((rule) => ({
    count: rule.count,
    id: createId("rule"),
    tagId: rule.tag,
  }));

  return {
    activeExerciseId: exercises[0]?.id ?? "",
    blueprint,
    description: definition.template,
    exercises,
    selectedAdvancedSections: [],
    selectedLocale: supportedLocales[0] ?? "en",
    title: "",
    useBlueprint: Boolean(definition.structure && definition.structure.length > 0),
  };
}
