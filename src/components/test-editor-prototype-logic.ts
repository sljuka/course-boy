import {
  evaluateFormulaAst,
  parseFormula,
  type FormulaAstNode,
} from "@/lib/formula-dsl";
import type { Locale } from "@/lib/i18n";

import type {
  BlueprintRule,
  PromptVariable,
  SolutionValidationResult,
  TestEditorState,
  TestExercise,
  VariableConstraint,
  VariableConstraintType,
} from "@/components/test-editor-prototype-types";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function createExerciseLocaleMap(locales: Locale[]) {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
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

function createExercise(locales: Locale[]): TestExercise {
  return {
    id: createId("ex"),
    locales: createExerciseLocaleMap(locales),
    solution: "",
    variables: [],
  };
}

function createInitialState(locales: Locale[], title: string): TestEditorState {
  return {
    activeExerciseId: "",
    blueprint: [
      { count: 3, id: createId("rule"), tag: "easy" },
      { count: 2, id: createId("rule"), tag: "medium" },
      { count: 1, id: createId("rule"), tag: "hard" },
    ] satisfies BlueprintRule[],
    description: "",
    exercises: [createExercise(locales)],
    selectedAdvancedSections: [],
    selectedLocale: locales[0] ?? "en",
    title,
    useBlueprint: false,
  };
}

function countMatchingExercises(exercises: TestExercise[], tag: string) {
  return exercises.filter((exercise) =>
    exercise.locales.en.prompt.toLowerCase().includes(tag.toLowerCase()),
  ).length;
}

function extractPromptVariables(prompt: string) {
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

function getConstraintLabel(constraint: VariableConstraint) {
  if (constraint.value === null) {
    return constraint.type;
  }

  return `${constraint.type}: ${constraint.value}`;
}

function syncExercisePrompt(
  exercise: TestExercise,
  locale: Locale,
  prompt: string,
): TestExercise {
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
          hint: "",
          prompt: "",
        }),
        prompt,
      },
    },
    variables: nextVariables,
  };
}

function addConstraintToVariable(
  exercise: TestExercise,
  variableId: string,
  type: VariableConstraintType,
  value: number | null,
): TestExercise {
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

function removeConstraintFromVariable(
  exercise: TestExercise,
  variableId: string,
  constraintId: string,
): TestExercise {
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

function removeVariableFromExercise(
  exercise: TestExercise,
  variableId: string,
): TestExercise {
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

function resolveSampleValue(variable: PromptVariable): number {
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

  for (let candidate = resolvedMin; candidate <= resolvedMax; candidate += 1) {
    if (hasEvenConstraint && candidate % 2 !== 0) {
      continue;
    }

    if (hasOddConstraint && candidate % 2 === 0) {
      continue;
    }

    return candidate;
  }

  throw new Error(`Variable "${variable.name}" has no valid values`);
}

function validateExerciseSolution(
  exercise: TestExercise,
  usedPromptVariableNames: Set<string>,
): SolutionValidationResult {
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
      message: `Example result: ${sampleResult}`,
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

function formatSampleVariables(sampleVariables: Record<string, number>) {
  const entries = Object.entries(sampleVariables);

  if (entries.length === 0) {
    return "";
  }

  return entries.map(([name, value]) => `${name} = ${value}`).join(", ");
}

export {
  addConstraintToVariable,
  countMatchingExercises,
  createInitialState,
  extractPromptVariables,
  formatSampleVariables,
  getConstraintLabel,
  removeConstraintFromVariable,
  removeVariableFromExercise,
  syncExercisePrompt,
  validateExerciseSolution,
};
