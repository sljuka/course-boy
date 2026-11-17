import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";
import type {
  ColumnArithmeticTestExercise,
  NumericSolutionSpace,
  SolutionValidationResult,
} from "@/components/test-editor-prototype-types";
import type { ColumnArithmeticOperation, SharedColumnArithmeticTestExerciseDefinition } from "@/lib/course-package";
import {
  canSatisfy,
  columnResult,
  MAX_COLUMN_OPERAND,
  MAX_COLUMN_OPERANDS,
  MIN_COLUMN_OPERANDS,
  rollColumnOperands,
} from "@/lib/exercise-kinds/column-arithmetic";
import type { Locale } from "@/lib/i18n";

// Written addition and subtraction (SLJ-231) in the editor: the operation,
// each number's range, and the rules the drawn numbers follow.

export { MAX_COLUMN_OPERAND, MAX_COLUMN_OPERANDS, MIN_COLUMN_OPERANDS };

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

const operand = (min: number, max: number) => ({ id: createId("operand"), max, min });

export function createExercise(locales: Locale[]): ColumnArithmeticTestExercise {
  return {
    gradeCarries: false,
    id: createId("ex"),
    kind: "column-arithmetic",
    locales: Object.fromEntries(locales.map((locale) => [locale, { hint: "", prompt: "" }])),
    operands: [operand(1000, 9999), operand(1000, 9999)],
    operation: "add",
    regrouping: "any",
    // The problem already has its own answer row on paper; room below it
    // is the exception, not the rule.
    solutionSpace: "sm",
    tagIds: [],
  };
}

export function updateLocale(
  exercise: ColumnArithmeticTestExercise,
  locale: Locale,
  change: Partial<{ hint: string; prompt: string }>,
): ColumnArithmeticTestExercise {
  const content = exercise.locales[locale] ?? { hint: "", prompt: "" };
  return { ...exercise, locales: { ...exercise.locales, [locale]: { ...content, ...change } } };
}

// Subtraction takes exactly two numbers: switching to it keeps the first two.
export function setOperation(exercise: ColumnArithmeticTestExercise, operation: ColumnArithmeticOperation): ColumnArithmeticTestExercise {
  return { ...exercise, operands: operation === "subtract" ? exercise.operands.slice(0, 2) : exercise.operands, operation };
}

export function maxOperands(exercise: Pick<ColumnArithmeticTestExercise, "operation">): number {
  return exercise.operation === "subtract" ? 2 : MAX_COLUMN_OPERANDS;
}

export function updateOperand(
  exercise: ColumnArithmeticTestExercise,
  index: number,
  change: Partial<{ max: number; min: number }>,
): ColumnArithmeticTestExercise {
  return {
    ...exercise,
    operands: exercise.operands.map((current, operandIndex) => (operandIndex === index ? { ...current, ...change } : current)),
  };
}

// A new number has the last one's range.
export function addOperand(exercise: ColumnArithmeticTestExercise): ColumnArithmeticTestExercise {
  if (exercise.operands.length >= maxOperands(exercise)) return exercise;
  const last = exercise.operands[exercise.operands.length - 1];
  return { ...exercise, operands: [...exercise.operands, operand(last?.min ?? 0, last?.max ?? 9999)] };
}

export function removeOperand(exercise: ColumnArithmeticTestExercise, index: number): ColumnArithmeticTestExercise {
  if (exercise.operands.length <= MIN_COLUMN_OPERANDS) return exercise;
  return { ...exercise, operands: exercise.operands.filter((_operand, operandIndex) => operandIndex !== index) };
}

const SIGNS: Record<ColumnArithmeticOperation, string> = { add: "+", subtract: "−" };

// "58 734 + 21 391 = 80 125": a sample, as the student might get it.
export function formatSample(operation: ColumnArithmeticOperation, operands: number[]): string {
  const format = (value: number) => value.toLocaleString("en").replaceAll(",", " ");
  return `${operands.map(format).join(` ${SIGNS[operation]} `)} = ${format(columnResult(operation, operands))}`;
}

function rangeProblem(exercise: ColumnArithmeticTestExercise): string | null {
  for (const [index, range] of exercise.operands.entries()) {
    if (!Number.isInteger(range.min) || !Number.isInteger(range.max) || range.min < 0 || range.max > MAX_COLUMN_OPERAND) {
      return `Number ${index + 1}: use whole numbers from 0 to ${MAX_COLUMN_OPERAND.toLocaleString("en")}`;
    }
    if (range.min > range.max) return `Number ${index + 1}: the smallest is bigger than the biggest`;
  }
  if (exercise.operation === "subtract" && exercise.operands[0].max < exercise.operands[1].min) {
    return "The first number is always smaller than the second: the answer would be below zero";
  }
  return null;
}

export function validate(exercise: ColumnArithmeticTestExercise, _locale: Locale): SolutionValidationResult {
  const problem = rangeProblem(exercise);
  if (problem) return { message: problem, status: "error" };
  if (!canSatisfy(exercise)) {
    return {
      message:
        exercise.regrouping === "required"
          ? "No numbers in these ranges need carrying or borrowing: widen them"
          : exercise.regrouping === "none"
            ? "Numbers in these ranges always need carrying or borrowing: change them"
            : "The first number is hardly ever bigger than the second: the answer would be below zero",
      status: "error",
    };
  }
  return { message: `For example ${formatSample(exercise.operation, rollColumnOperands(exercise))}`, status: "valid" };
}

function normalizeSpace(space: unknown): NumericSolutionSpace {
  return space === "sm" || space === "lg" || space === "xl" ? space : "md";
}

export function toShared(exercise: ColumnArithmeticTestExercise): SharedColumnArithmeticTestExerciseDefinition {
  return {
    ...(exercise.gradeCarries ? { gradeCarries: true } : {}),
    kind: "column-arithmetic",
    locales: filterValidLocaleEntries(
      Object.fromEntries(
        Object.entries(exercise.locales).map(([locale, content]) => [
          locale,
          { prompt: content.prompt, ...(content.hint ? { hint: content.hint } : {}) },
        ]),
      ),
    ),
    operands: exercise.operands.map(({ max, min }) => ({ max, min })),
    operation: exercise.operation,
    ...(exercise.regrouping !== "any" ? { regrouping: exercise.regrouping } : {}),
    space: exercise.solutionSpace,
    tags: exercise.tagIds,
  };
}

export function fromShared(definition: SharedColumnArithmeticTestExerciseDefinition): ColumnArithmeticTestExercise {
  return {
    gradeCarries: definition.gradeCarries ?? false,
    id: createId("ex"),
    kind: "column-arithmetic",
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [locale, { hint: content?.hint ?? "", prompt: content?.prompt ?? "" }]),
    ),
    operands: definition.operands.map(({ max, min }) => operand(min, max)),
    operation: definition.operation,
    regrouping: definition.regrouping ?? "any",
    solutionSpace: normalizeSpace(definition.space),
    tagIds: definition.tags,
  };
}
