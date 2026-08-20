import { resolveVariableBounds } from "@/components/test-editor-prototype-logic";
import type {
  BlueprintRule,
  ExerciseLocaleContent,
  PromptVariable,
  TestEditorState,
  TestExercise,
  VariableConstraint,
} from "@/components/test-editor-prototype-types";
import type {
  CourseExerciseVariable,
  CourseTestStructureRule,
  SharedTestDefinition,
  SharedTestExerciseDefinition,
} from "@/lib/course-package";
import { locales, type Locale } from "@/lib/i18n";

const DEFAULT_SOLUTION_PRECISION = 2;

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function toCourseExerciseVariable(variable: PromptVariable): CourseExerciseVariable {
  const { max, min, parity } = resolveVariableBounds(variable);

  return {
    max,
    min,
    ...(parity ? { parity } : {}),
    type: "integer",
  };
}

export function fromCourseExerciseVariable(
  name: string,
  definition: CourseExerciseVariable,
): PromptVariable {
  const constraints: VariableConstraint[] = [
    { id: createId("constraint"), type: "min-value", value: definition.min },
    { id: createId("constraint"), type: "max-value", value: definition.max },
  ];

  if (definition.parity === "even") {
    constraints.push({ id: createId("constraint"), type: "even-number", value: null });
  }

  if (definition.parity === "odd") {
    constraints.push({ id: createId("constraint"), type: "odd-number", value: null });
  }

  return {
    constraints,
    id: createId("var"),
    name,
  };
}

export function toSharedTestExerciseDefinition(
  exercise: TestExercise,
): SharedTestExerciseDefinition {
  const locales = Object.fromEntries(
    Object.entries(exercise.locales).filter(([locale]) => isLocale(locale)),
  ) as Partial<Record<Locale, ExerciseLocaleContent>>;

  return {
    locales,
    solution: {
      formula: exercise.solution,
      precision: DEFAULT_SOLUTION_PRECISION,
    },
    tags: exercise.tagIds,
    variables: Object.fromEntries(
      exercise.variables.map((variable) => [variable.name, toCourseExerciseVariable(variable)]),
    ),
  };
}

export function fromSharedTestExerciseDefinition(
  definition: SharedTestExerciseDefinition,
): TestExercise {
  return {
    id: createId("ex"),
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [
        locale,
        { hint: content?.hint ?? "", prompt: content?.prompt ?? "" },
      ]),
    ),
    solution: definition.solution.formula,
    tagIds: definition.tags,
    variables: Object.entries(definition.variables).map(([name, variableDefinition]) =>
      fromCourseExerciseVariable(name, variableDefinition),
    ),
  };
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

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
