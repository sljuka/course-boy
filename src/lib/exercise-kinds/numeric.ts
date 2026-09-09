import type {
  CourseExerciseVariable,
  NumericCourseExercise,
  SharedNumericTestExerciseDefinition,
} from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { evaluateFormula } from "../formula-dsl";
import { isLocale } from "../i18n";

import {
  hasValidTags,
  type ExerciseKindRuntime,
  type GradeResult,
  type ResolveForPlayerContext,
} from "./types";

export function roundToPrecision(value: number, precision: number): number {
  const multiplier = 10 ** precision;

  return Math.round(value * multiplier) / multiplier;
}

const MAX_PARITY_RESAMPLE_ATTEMPTS = 50;

function matchesParity(value: number, parity: "even" | "odd" | undefined): boolean {
  return !parity || (value % 2 === 0) === (parity === "even");
}

function nearestValueWithParity(
  min: number,
  max: number,
  parity: "even" | "odd" | undefined,
): number {
  for (let value = min; value <= max; value += 1) {
    if (matchesParity(value, parity)) {
      return value;
    }
  }

  return min;
}

export function rollVariableValue(definition: CourseExerciseVariable): number {
  const span = definition.max - definition.min + 1;

  for (let attempt = 0; attempt < MAX_PARITY_RESAMPLE_ATTEMPTS; attempt += 1) {
    const candidate = Math.floor(Math.random() * span) + definition.min;

    if (matchesParity(candidate, definition.parity)) {
      return candidate;
    }
  }

  return nearestValueWithParity(definition.min, definition.max, definition.parity);
}

function extractTemplateVariables(source: string): string[] {
  return [...source.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
}

function isVariableRangeSatisfiable(
  min: number,
  max: number,
  parity: "even" | "odd" | undefined,
): boolean {
  if (!parity) {
    return true;
  }

  const wantsEven = parity === "even";

  for (let value = min; value <= max; value += 1) {
    if (value % 2 === 0 === wantsEven) {
      return true;
    }
  }

  return false;
}

function isSolutionSpace(
  solutionSpace: unknown,
): solutionSpace is SharedNumericTestExerciseDefinition["solution"]["space"] {
  return (
    (typeof solutionSpace === "number" &&
      Number.isInteger(solutionSpace) &&
      solutionSpace > 0) ||
    solutionSpace === "sm" ||
    solutionSpace === "md" ||
    solutionSpace === "lg" ||
    solutionSpace === "xl"
  );
}

function isValid(
  exercise: Record<string, unknown>,
): exercise is SharedNumericTestExerciseDefinition {
  if (!hasValidTags(exercise)) {
    return false;
  }

  if (
    !exercise.locales ||
    typeof exercise.locales !== "object" ||
    !Object.entries(exercise.locales).every(([locale, metadata]) => {
      if (!isLocale(locale) || !metadata || typeof metadata !== "object") {
        return false;
      }

      const typedMetadata = metadata as { hint?: unknown; prompt?: unknown };

      return (
        typeof typedMetadata.prompt === "string" &&
        (typeof typedMetadata.hint === "undefined" ||
          typeof typedMetadata.hint === "string")
      );
    })
  ) {
    return false;
  }

  const solution = exercise.solution as
    | { formula?: unknown; precision?: unknown; space?: unknown }
    | undefined;

  if (
    !solution ||
    typeof solution !== "object" ||
    typeof solution.formula !== "string" ||
    typeof solution.precision !== "number" ||
    (typeof solution.space !== "undefined" && !isSolutionSpace(solution.space)) ||
    !exercise.variables ||
    typeof exercise.variables !== "object" ||
    !Object.values(exercise.variables).every((variable) => {
      if (!variable || typeof variable !== "object") {
        return false;
      }

      const typedVariable = variable as Partial<CourseExerciseVariable>;

      if (
        typedVariable.type !== "integer" ||
        typeof typedVariable.min !== "number" ||
        typeof typedVariable.max !== "number" ||
        typedVariable.min > typedVariable.max ||
        (typeof typedVariable.parity !== "undefined" &&
          typedVariable.parity !== "even" &&
          typedVariable.parity !== "odd")
      ) {
        return false;
      }

      return isVariableRangeSatisfiable(
        typedVariable.min,
        typedVariable.max,
        typedVariable.parity,
      );
    })
  ) {
    return false;
  }

  const variableNames = new Set(Object.keys(exercise.variables as object));
  const locales = exercise.locales as Record<string, { prompt: string }>;

  return Object.values(locales).every((metadata) => {
    return extractTemplateVariables(metadata.prompt).every((variableName) =>
      variableNames.has(variableName),
    );
  });
}

function resolveForPlayer(
  shared: SharedNumericTestExerciseDefinition,
  context: ResolveForPlayerContext,
): NumericCourseExercise {
  return {
    formula: shared.solution.formula,
    hint: context.hint,
    id: context.id,
    kind: "numeric",
    precision: shared.solution.precision,
    prompt: context.prompt,
    solutionSpace: shared.solution.space ?? "sm",
    tags: shared.tags,
    variables: shared.variables,
  };
}

function buildInstance(exercise: NumericCourseExercise): ExerciseInstance {
  const variables = Object.fromEntries(
    Object.entries(exercise.variables).map(([variableName, variableDefinition]) => {
      return [variableName, rollVariableValue(variableDefinition)];
    }),
  );
  const expectedAnswer = roundToPrecision(
    evaluateFormula(exercise.formula, variables),
    exercise.precision,
  );

  return { expectedAnswer, kind: "numeric", variables };
}

function grade(
  exercise: NumericCourseExercise,
  instance: ExerciseInstance,
  rawAnswer: string,
): GradeResult {
  const normalizedAnswer = rawAnswer.trim();

  if (!normalizedAnswer) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.enterAnswer" };
  }

  const parsedAnswer = Number(normalizedAnswer.replace(",", "."));

  if (Number.isNaN(parsedAnswer)) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.enterAnswer" };
  }

  const roundedAnswer = roundToPrecision(parsedAnswer, exercise.precision);

  if (instance.kind === "numeric" && roundedAnswer === instance.expectedAnswer) {
    return { isCorrect: true };
  }

  return { isAnswered: true, isCorrect: false };
}

export const numericExerciseRuntime: ExerciseKindRuntime<
  SharedNumericTestExerciseDefinition,
  NumericCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "numeric",
  resolveForPlayer,
};
