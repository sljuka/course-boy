import {
  evaluateFormulaAst,
  parseFormula,
  type FormulaAstNode,
} from "@/lib/formula-dsl";
import type { Locale } from "@/lib/i18n";
import {
  createCourseTagDefinition,
  isCourseTagColor,
  normalizeCourseTagLabel,
  type CourseTagDefinition,
} from "@/lib/course-tags";

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
    tagIds: [],
    variables: [],
  };
}

function createInitialState(locales: Locale[], title: string): TestEditorState {
  return {
    activeExerciseId: "",
    blueprint: [
      { count: 3, id: createId("rule"), tagId: "easy" },
      { count: 2, id: createId("rule"), tagId: "medium" },
      { count: 1, id: createId("rule"), tagId: "challenging" },
    ] satisfies BlueprintRule[],
    description: "",
    exercises: [createExercise(locales)],
    selectedAdvancedSections: [],
    selectedLocale: locales[0] ?? "en",
    title,
    useBlueprint: false,
  };
}

function createInitialCourseTags(): CourseTagDefinition[] {
  return [
    {
      color: "emerald",
      id: "easy",
      label: "Easy",
    },
    {
      color: "amber",
      id: "medium",
      label: "Medium",
    },
    {
      color: "rose",
      id: "challenging",
      label: "Challenging",
    },
  ];
}

function countMatchingExercises(exercises: TestExercise[], tagId: string) {
  return exercises.filter((exercise) => exercise.tagIds.includes(tagId)).length;
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

function normalizeDraftTestData(
  rawTestDrafts: Record<string, TestEditorState>,
  rawDescriptiveTags: CourseTagDefinition[] | undefined,
) {
  const normalizedDescriptiveTags = Array.isArray(rawDescriptiveTags)
    ? rawDescriptiveTags
        .filter(
          (tag): tag is CourseTagDefinition =>
            Boolean(tag) &&
            typeof tag.id === "string" &&
            typeof tag.label === "string" &&
            tag.id.trim().length > 0 &&
            normalizeCourseTagLabel(tag.label).length > 0 &&
            isCourseTagColor(tag.color),
        )
        .map((tag) => ({
          ...tag,
          label: normalizeCourseTagLabel(tag.label),
        }))
    : [];
  const tagIndex = new Map(
    normalizedDescriptiveTags.map(
      (tag) => [tag.id, tag] satisfies [string, CourseTagDefinition],
    ),
  );

  function ensureDescriptiveTagByLabel(label: string) {
    const normalizedLabel = normalizeCourseTagLabel(label);

    if (!normalizedLabel) {
      return "";
    }

    const existingTag = normalizedDescriptiveTags.find(
      (tag) => tag.label.toLowerCase() === normalizedLabel.toLowerCase(),
    );

    if (existingTag) {
      return existingTag.id;
    }

    const nextTag = createCourseTagDefinition(
      normalizedLabel,
      "sky",
      normalizedDescriptiveTags,
    );
    normalizedDescriptiveTags.push(nextTag);
    tagIndex.set(nextTag.id, nextTag);

    return nextTag.id;
  }

  function ensureDescriptiveTagById(tagId: string) {
    if (tagIndex.has(tagId)) {
      return tagId;
    }

    const nextTag = {
      color: "sky",
      id: tagId,
      label: tagId
        .split("-")
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    } satisfies CourseTagDefinition;
    normalizedDescriptiveTags.push(nextTag);
    tagIndex.set(nextTag.id, nextTag);

    return nextTag.id;
  }

  const normalizedTestDrafts = Object.fromEntries(
    Object.entries(rawTestDrafts ?? {}).map(([draftId, draftState]) => {
      const normalizedExercises = Array.isArray(draftState.exercises)
        ? draftState.exercises.map((exercise) => {
            const legacyTagLabels = Array.isArray(
              (exercise as TestExercise & { tags?: string[] }).tags,
            )
              ? (exercise as TestExercise & { tags?: string[] }).tags ?? []
              : [];
            const rawTagIds = Array.isArray(exercise.tagIds)
              ? exercise.tagIds
              : legacyTagLabels.map((tagLabel) =>
                  ensureDescriptiveTagByLabel(tagLabel),
                );

            return {
              ...exercise,
              tagIds: [
                ...new Set(rawTagIds.map((tagId) => ensureDescriptiveTagById(tagId))),
              ],
              variables: Array.isArray(exercise.variables) ? exercise.variables : [],
            };
          })
        : [];
      const normalizedBlueprint = Array.isArray(draftState.blueprint)
        ? draftState.blueprint.map((rule) => {
            const legacyTag = (rule as BlueprintRule & { tag?: string }).tag;
            const tagId =
              typeof (rule as BlueprintRule).tagId === "string" &&
              (rule as BlueprintRule).tagId.trim().length > 0
                ? ensureDescriptiveTagById((rule as BlueprintRule).tagId)
                : typeof legacyTag === "string"
                  ? ensureDescriptiveTagByLabel(legacyTag)
                  : "";

            return {
              count: Math.max(1, Number(rule.count) || 1),
              id: rule.id,
              tagId,
            } satisfies BlueprintRule;
          })
        : [];

      return [
        draftId,
        {
          ...draftState,
          activeExerciseId:
            typeof draftState.activeExerciseId === "string"
              ? draftState.activeExerciseId
              : "",
          blueprint: normalizedBlueprint,
          exercises: normalizedExercises,
          selectedAdvancedSections: Array.isArray(draftState.selectedAdvancedSections)
            ? draftState.selectedAdvancedSections
            : [],
        } satisfies TestEditorState,
      ];
    }),
  ) satisfies Record<string, TestEditorState>;

  if (normalizedDescriptiveTags.length === 0) {
    const fallbackTags = createInitialCourseTags();

    for (const tag of fallbackTags) {
      normalizedDescriptiveTags.push(tag);
      tagIndex.set(tag.id, tag);
    }
  }

  return {
    descriptiveTags: normalizedDescriptiveTags,
    testDrafts: normalizedTestDrafts,
  };
}

function toggleExerciseTag(
  exercise: TestExercise,
  tagId: string,
): TestExercise {
  const hasTag = exercise.tagIds.includes(tagId);

  return {
    ...exercise,
    tagIds: hasTag
      ? exercise.tagIds.filter((currentTagId) => currentTagId !== tagId)
      : [...exercise.tagIds, tagId],
  };
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
  createInitialCourseTags,
  extractPromptVariables,
  formatSampleVariables,
  getConstraintLabel,
  normalizeDraftTestData,
  removeConstraintFromVariable,
  removeVariableFromExercise,
  syncExercisePrompt,
  toggleExerciseTag,
  validateExerciseSolution,
};
