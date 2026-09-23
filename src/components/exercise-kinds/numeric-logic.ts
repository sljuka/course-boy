import {
  evaluateFormulaAst,
  parseFormula,
  type FormulaAstNode,
} from "@/lib/formula-dsl";
import type {
  CourseExerciseVariable,
  SharedNumericTestExerciseDefinition,
} from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";

import type {
  NumericSolutionSpace,
  NumericTestExercise,
  PromptVariable,
  SolutionValidationResult,
  VariableConstraint,
  VariableConstraintType,
} from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function createExerciseLocaleMap(locales: Locale[]) {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        answerPlaceholder: "",
        hint: "",
        prompt: "",
      },
    ]),
  );
}

function createDefaultConstraints(): VariableConstraint[] {
  return [
    {
      id: createId("constraint"),
      type: "min-value",
      value: 5,
    },
    {
      id: createId("constraint"),
      type: "max-value",
      value: 100,
    },
  ];
}

export function createExercise(locales: Locale[]): NumericTestExercise {
  return {
    kind: "numeric",
    id: createId("ex"),
    locales: createExerciseLocaleMap(locales),
    solution: "",
    solutionSpace: "sm",
    tagIds: [],
    variables: [],
  };
}

// The shared/on-disk `space` field also allows an arbitrary line-count
// `number` (used nowhere in the UI today), which the draft editor's `Select`
// has no representation for — fall back to "sm" rather than crash on it.
function normalizeSolutionSpace(space: unknown): NumericSolutionSpace {
  return space === "sm" || space === "md" || space === "lg" || space === "xl" ? space : "sm";
}

export function extractPromptVariables(prompt: string) {
  const variableNames = new Set<string>();
  const variablePattern = /\{\{\s*([a-zA-Z_][\w-]*)\s*\}\}/g;

  for (const match of prompt.matchAll(variablePattern)) {
    const variableName = match[1]?.trim();

    if (variableName) {
      variableNames.add(variableName);
    }
  }

  return [...variableNames];
}

export function getConstraintLabel(constraint: VariableConstraint) {
  if (constraint.value === null) {
    return constraint.type;
  }

  return `${constraint.type}: ${constraint.value}`;
}

export function syncExercisePrompt(
  exercise: NumericTestExercise,
  locale: Locale,
  prompt: string,
): NumericTestExercise {
  const detectedVariableNames = extractPromptVariables(prompt);
  const existingNames = new Set(exercise.variables.map((variable) => variable.name));
  const nextVariables = [...exercise.variables];

  for (const variableName of detectedVariableNames) {
    if (!existingNames.has(variableName)) {
      nextVariables.push({
        constraints: createDefaultConstraints(),
        id: createId("var"),
        name: variableName,
      });
    }
  }

  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: {
        ...(exercise.locales[locale] ?? {
          answerPlaceholder: "",
          hint: "",
          prompt: "",
        }),
        prompt,
      },
    },
    variables: nextVariables,
  };
}

export function addConstraintToVariable(
  exercise: NumericTestExercise,
  variableId: string,
  type: VariableConstraintType,
  value: number | null,
): NumericTestExercise {
  return {
    ...exercise,
    variables: exercise.variables.map((variable) =>
      variable.id === variableId
        ? {
            ...variable,
            constraints: [
              ...variable.constraints,
              {
                id: createId("constraint"),
                type,
                value,
              },
            ],
          }
        : variable,
    ),
  };
}

export function removeConstraintFromVariable(
  exercise: NumericTestExercise,
  variableId: string,
  constraintId: string,
): NumericTestExercise {
  return {
    ...exercise,
    variables: exercise.variables.map((variable) =>
      variable.id === variableId
        ? {
            ...variable,
            constraints: variable.constraints.filter(
              (constraint) => constraint.id !== constraintId,
            ),
          }
        : variable,
    ),
  };
}

export function removeVariableFromExercise(
  exercise: NumericTestExercise,
  variableId: string,
): NumericTestExercise {
  return {
    ...exercise,
    variables: exercise.variables.filter((variable) => variable.id !== variableId),
  };
}

function collectFormulaVariables(node: FormulaAstNode): string[] {
  switch (node.type) {
    case "variable":
      return [node.name];
    case "binary":
      return [...collectFormulaVariables(node.left), ...collectFormulaVariables(node.right)];
    case "negate":
      return collectFormulaVariables(node.operand);
    case "number":
      return [];
  }
}

type VariableBounds = {
  max: number;
  min: number;
  parity?: "even" | "odd";
};

export function resolveVariableBounds(variable: PromptVariable): VariableBounds {
  const minValueConstraints = variable.constraints.filter(
    (constraint) => constraint.type === "min-value" && constraint.value !== null,
  );
  const maxValueConstraints = variable.constraints.filter(
    (constraint) => constraint.type === "max-value" && constraint.value !== null,
  );
  const hasEvenConstraint = variable.constraints.some(
    (constraint) => constraint.type === "even-number",
  );
  const hasOddConstraint = variable.constraints.some(
    (constraint) => constraint.type === "odd-number",
  );

  if (hasEvenConstraint && hasOddConstraint) {
    throw new Error(`Variable "${variable.name}" cannot be both even and odd`);
  }

  const minValue = minValueConstraints.reduce(
    (currentMin, constraint) => Math.max(currentMin, constraint.value ?? currentMin),
    Number.NEGATIVE_INFINITY,
  );
  const maxValue = maxValueConstraints.reduce(
    (currentMax, constraint) => Math.min(currentMax, constraint.value ?? currentMax),
    Number.POSITIVE_INFINITY,
  );

  const resolvedMin = Number.isFinite(minValue) ? minValue : 0;
  const resolvedMax = Number.isFinite(maxValue) ? maxValue : 100;

  if (resolvedMin > resolvedMax) {
    throw new Error(
      `Variable "${variable.name}" has impossible bounds (${resolvedMin} > ${resolvedMax})`,
    );
  }

  return {
    max: resolvedMax,
    min: resolvedMin,
    ...(hasEvenConstraint ? { parity: "even" as const } : {}),
    ...(hasOddConstraint ? { parity: "odd" as const } : {}),
  };
}

function resolveSampleValue(variable: PromptVariable): number {
  const { max, min, parity } = resolveVariableBounds(variable);

  for (let candidate = min; candidate <= max; candidate += 1) {
    if (parity === "even" && candidate % 2 !== 0) {
      continue;
    }

    if (parity === "odd" && candidate % 2 === 0) {
      continue;
    }

    return candidate;
  }

  throw new Error(`Variable "${variable.name}" has no valid values`);
}

export function validate(exercise: NumericTestExercise, locale: Locale): SolutionValidationResult {
  const prompt = exercise.locales[locale]?.prompt ?? "";
  const usedPromptVariableNames = new Set(extractPromptVariables(prompt));
  const solution = exercise.solution.trim();

  if (!solution) {
    return { status: "idle" };
  }

  try {
    const formulaAst = parseFormula(solution);
    const referencedVariables = [...new Set(collectFormulaVariables(formulaAst))];
    const declaredVariables = new Map(
      exercise.variables.map((variable) => [variable.name, variable]),
    );
    const unknownVariables = referencedVariables.filter(
      (variableName) => !declaredVariables.has(variableName),
    );

    if (unknownVariables.length > 0) {
      return {
        message: `Unknown variable "${unknownVariables[0]}"`,
        status: "error",
      };
    }

    const sampleVariables = Object.fromEntries(
      referencedVariables.map((variableName) => {
        const variable = declaredVariables.get(variableName);

        if (!variable) {
          throw new Error(`Unknown variable "${variableName}"`);
        }

        return [variableName, resolveSampleValue(variable)];
      }),
    );
    const sampleResult = evaluateFormulaAst(formulaAst, sampleVariables);
    const promptUnusedVariables = referencedVariables.filter(
      (variableName) => !usedPromptVariableNames.has(variableName),
    );

    if (promptUnusedVariables.length > 0) {
      return {
        message: `Variable "${promptUnusedVariables[0]}" is not used in prompt`,
        sampleResult,
        sampleVariables,
        status: "warning",
      };
    }

    return {
      message: `Result is ${sampleResult}`,
      sampleResult,
      sampleVariables,
      status: "valid",
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Invalid solution",
      status: "error",
    };
  }
}

export function formatSampleVariables(sampleVariables: Record<string, number>) {
  const entries = Object.entries(sampleVariables);

  if (entries.length === 0) {
    return "";
  }

  return entries.map(([name, value]) => `${name} = ${value}`).join(", ");
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

const DEFAULT_SOLUTION_PRECISION = 2;

export function toShared(exercise: NumericTestExercise): SharedNumericTestExerciseDefinition {
  return {
    kind: "numeric",
    locales: filterValidLocaleEntries(exercise.locales),
    solution: {
      formula: exercise.solution,
      precision: DEFAULT_SOLUTION_PRECISION,
      space: exercise.solutionSpace,
    },
    tags: exercise.tagIds,
    variables: Object.fromEntries(
      exercise.variables.map((variable) => [variable.name, toCourseExerciseVariable(variable)]),
    ),
  };
}

export function fromShared(definition: SharedNumericTestExerciseDefinition): NumericTestExercise {
  return {
    kind: "numeric",
    id: createId("ex"),
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [
        locale,
        {
          answerPlaceholder: content?.answerPlaceholder ?? "",
          hint: content?.hint ?? "",
          prompt: content?.prompt ?? "",
        },
      ]),
    ),
    solution: definition.solution.formula,
    solutionSpace: normalizeSolutionSpace(definition.solution.space),
    tagIds: definition.tags,
    variables: Object.entries(definition.variables).map(([name, variableDefinition]) =>
      fromCourseExerciseVariable(name, variableDefinition),
    ),
  };
}
