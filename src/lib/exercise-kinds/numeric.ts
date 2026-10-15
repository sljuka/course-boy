import type {
  CourseExerciseVariable,
  NumericCourseExercise,
  NumericSolution,
  SharedNumericTestExerciseDefinition,
} from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { evaluateFormula } from "../formula-dsl";
import { isLocale, type Locale } from "../i18n";
import { findTemplateVariables } from "../template-variables";

import {
  hasValidTags,
  partShare,
  type ExerciseKindRuntime,
  type GradeResult,
  type ResolveForPlayerContext,
  type ReviewPart,
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
  return findTemplateVariables(source);
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

function areNumericSolutions(value: unknown): value is NumericSolution[] {
  return (
    Array.isArray(value) &&
    value.every(
      (solution) =>
        Boolean(solution) &&
        typeof solution === "object" &&
        typeof (solution as NumericSolution).formula === "string" &&
        typeof (solution as NumericSolution).precision === "number",
    )
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

      const typedMetadata = metadata as {
        answerPlaceholder?: unknown;
        hint?: unknown;
        prompt?: unknown;
        solutionLabels?: unknown;
      };

      return (
        typeof typedMetadata.prompt === "string" &&
        (typeof typedMetadata.solutionLabels === "undefined" ||
          (Array.isArray(typedMetadata.solutionLabels) &&
            typedMetadata.solutionLabels.every((label) => typeof label === "string"))) &&
        (typeof typedMetadata.hint === "undefined" ||
          typeof typedMetadata.hint === "string") &&
        (typeof typedMetadata.answerPlaceholder === "undefined" ||
          typeof typedMetadata.answerPlaceholder === "string")
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
    (typeof exercise.moreSolutions !== "undefined" && !areNumericSolutions(exercise.moreSolutions)) ||
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

// The solutions' labels in the first of the reader's languages that has them.
function resolveSolutionLabels(
  shared: SharedNumericTestExerciseDefinition,
  requestedLocales: Locale[],
): string[] | undefined {
  for (const locale of requestedLocales) {
    const labels = shared.locales[locale]?.solutionLabels;
    if (labels && labels.length > 0) return labels;
  }

  return Object.values(shared.locales).find((content) => content?.solutionLabels?.length)?.solutionLabels;
}

function resolveForPlayer(
  shared: SharedNumericTestExerciseDefinition,
  context: ResolveForPlayerContext,
): NumericCourseExercise {
  const solutionLabels = shared.moreSolutions?.length
    ? resolveSolutionLabels(shared, context.requestedLocales)
    : undefined;

  return {
    ...(shared.moreSolutions?.length ? { moreSolutions: shared.moreSolutions } : {}),
    ...(solutionLabels ? { solutionLabels } : {}),
    answerPlaceholder: context.answerPlaceholder,
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
  const expectedAnswers = numericSolutions(exercise).map((solution) =>
    roundToPrecision(evaluateFormula(solution.formula, variables), solution.precision),
  );

  return { expectedAnswer: expectedAnswers[0], expectedAnswers, kind: "numeric", variables };
}

// One number typed, rounded like the solution; null if it isn't a number.
function parseAnswer(raw: string, precision: number): number | null {
  const normalized = raw.trim();
  if (!normalized) return null;
  const parsed = Number(normalized.replace(",", "."));
  return Number.isNaN(parsed) ? null : roundToPrecision(parsed, precision);
}

function grade(
  exercise: NumericCourseExercise,
  instance: ExerciseInstance,
  rawAnswer: string,
): GradeResult {
  const solutions = numericSolutions(exercise);
  const expected = instance.kind === "numeric" ? instance.expectedAnswers ?? [instance.expectedAnswer] : [];

  if (solutions.length === 1) {
    const answer = parseAnswer(rawAnswer, solutions[0].precision);

    if (answer === null) {
      return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.enterAnswer" };
    }

    return answer === expected[0] ? { isCorrect: true } : { isAnswered: true, isCorrect: false };
  }

  // Several solutions (SLJ-139): each box on its own.
  const answers = decodeNumericAnswers(rawAnswer, solutions.length).map((raw, index) =>
    parseAnswer(raw, solutions[index].precision),
  );

  if (answers.every((answer) => answer === null)) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.enterAnswer" };
  }

  const parts = answers.map((answer, index) => answer !== null && answer === expected[index]);
  const right = parts.filter(Boolean).length;

  if (right === solutions.length) {
    return { isCorrect: true };
  }

  return {
    isAnswered: true,
    isCorrect: false,
    parts,
    share: partShare(right, 0, solutions.length),
    ...(answers.some((answer) => answer === null) ? { incomplete: true } : {}),
  };
}

function review(exercise: NumericCourseExercise, instance: ExerciseInstance, rawAnswer: string): ReviewPart[] {
  const solutions = numericSolutions(exercise);
  const expected = instance.kind === "numeric" ? instance.expectedAnswers ?? [instance.expectedAnswer] : [];
  const answers = decodeNumericAnswers(rawAnswer, solutions.length);

  return solutions.map((solution, index) => {
    const answer = parseAnswer(answers[index] ?? "", solution.precision);
    return {
      answer: (answers[index] ?? "").trim(),
      isCorrect: answer !== null && answer === expected[index],
      ...(solutions.length > 1 ? { label: exercise.solutionLabels?.[index] ?? `${index + 1}` } : {}),
      solution: String(expected[index] ?? ""),
    };
  });
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
  review,
};

// Every solution of an exercise, the first (`formula`) first.
export function numericSolutions(exercise: Pick<NumericCourseExercise, "formula" | "moreSolutions" | "precision">): NumericSolution[] {
  return [{ formula: exercise.formula, precision: exercise.precision }, ...(exercise.moreSolutions ?? [])];
}

// Several boxes' answers as one string: a JSON list. One box's is the text
// itself, as before several solutions existed.
export function encodeNumericAnswers(answers: string[]): string {
  return answers.length === 1 ? (answers[0] ?? "") : JSON.stringify(answers);
}

export function decodeNumericAnswers(raw: string, count: number): string[] {
  if (count === 1) return [raw];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return Array.from({ length: count }, (_, index) => (typeof parsed[index] === "string" ? parsed[index] : ""));
    }
  } catch {
    // Not a list (e.g. empty): the first box only.
  }

  return Array.from({ length: count }, (_, index) => (index === 0 ? raw : ""));
}
