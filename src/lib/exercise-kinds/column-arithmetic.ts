import type {
  ColumnArithmeticCourseExercise,
  ColumnArithmeticOperandRange,
  ColumnArithmeticOperation,
  ColumnArithmeticRegrouping,
  SharedColumnArithmeticTestExerciseDefinition,
} from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isLocale } from "../i18n";

import { hasValidTags, partShare, type ExerciseKindRuntime, type GradeResult, type ResolveForPlayerContext, type ReviewPart } from "./types";

// Written addition and subtraction (SLJ-231), the way it's done on squared
// paper: the numbers stacked by place value, the answer written digit by
// digit from the right, with what's carried (or borrowed) noted above the
// next column. Columns are counted from the right: column 0 is the ones.
//
// A borrow is noted the same way as a carry: a 1 over the column it goes
// into (the method where the 1 is added to the lower digit there), so both
// operations have one row of small boxes and the same check.

export const MIN_COLUMN_OPERANDS = 2;
export const MAX_COLUMN_OPERANDS = 4;
// Twelve digits: hundreds of billions, well past what's taught, and safely
// inside a JavaScript number.
export const MAX_COLUMN_OPERAND = 999_999_999_999;

// How many tries at numbers that satisfy the exercise's rules before giving
// up and using the last ones (a rule no numbers in the ranges can satisfy is
// caught in the editor; see `canSatisfy`).
const MAX_ROLLS = 500;

export function columnResult(operation: ColumnArithmeticOperation, operands: number[]): number {
  if (operation === "subtract") return (operands[0] ?? 0) - (operands[1] ?? 0);
  return operands.reduce((sum, operand) => sum + operand, 0);
}

// A number's digits, ones first.
export function digitsOf(value: number): number[] {
  return String(Math.abs(Math.trunc(value)))
    .split("")
    .reverse()
    .map(Number);
}

// How many columns the problem takes: its widest number, the answer included.
export function columnCount(operation: ColumnArithmeticOperation, operands: number[]): number {
  return Math.max(...[...operands, columnResult(operation, operands)].map((value) => digitsOf(value).length));
}

// What's carried (or borrowed) into each column; column 0 never gets any.
export function columnCarries(operation: ColumnArithmeticOperation, operands: number[]): number[] {
  const count = columnCount(operation, operands);
  const digits = operands.map(digitsOf);
  const carries = [0];

  for (let column = 0; column < count - 1; column += 1) {
    const carryIn = carries[column] ?? 0;
    if (operation === "subtract") {
      const top = digits[0]?.[column] ?? 0;
      const bottom = digits[1]?.[column] ?? 0;
      carries.push(top < bottom + carryIn ? 1 : 0);
    } else {
      const sum = digits.reduce((total, number) => total + (number[column] ?? 0), carryIn);
      carries.push(Math.floor(sum / 10));
    }
  }

  return carries;
}

function satisfiesRegrouping(operation: ColumnArithmeticOperation, operands: number[], regrouping: ColumnArithmeticRegrouping): boolean {
  if (regrouping === "any") return true;
  const regroups = columnCarries(operation, operands).some((carry) => carry > 0);
  return regrouping === "required" ? regroups : !regroups;
}

function rollInRange({ max, min }: ColumnArithmeticOperandRange): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isAcceptable(exercise: Pick<ColumnArithmeticCourseExercise, "operation" | "regrouping">, operands: number[]): boolean {
  if (exercise.operation === "subtract" && columnResult("subtract", operands) < 0) return false;
  return satisfiesRegrouping(exercise.operation, operands, exercise.regrouping);
}

// Numbers for one attempt, within each one's range and the exercise's rules.
export function rollColumnOperands(
  exercise: Pick<ColumnArithmeticCourseExercise, "operands" | "operation" | "regrouping">,
): number[] {
  let operands = exercise.operands.map(rollInRange);

  for (let attempt = 1; attempt < MAX_ROLLS && !isAcceptable(exercise, operands); attempt += 1) {
    operands = exercise.operands.map(rollInRange);
  }

  // Never a negative answer, even when the rules couldn't be met.
  if (exercise.operation === "subtract" && columnResult("subtract", operands) < 0) {
    operands = [...operands].sort((first, second) => second - first);
  }

  return operands;
}

// Whether numbers in these ranges can meet the rules: tried, the way the
// player draws them, for the editor's check.
export function canSatisfy(exercise: Pick<ColumnArithmeticCourseExercise, "operands" | "operation" | "regrouping">): boolean {
  for (let attempt = 0; attempt < MAX_ROLLS; attempt += 1) {
    if (isAcceptable(exercise, exercise.operands.map(rollInRange))) return true;
  }
  return false;
}

function isOperandRange(value: unknown): value is ColumnArithmeticOperandRange {
  if (!value || typeof value !== "object") return false;
  const { max, min } = value as { max?: unknown; min?: unknown };
  return (
    Number.isInteger(min) &&
    Number.isInteger(max) &&
    (min as number) >= 0 &&
    (max as number) <= MAX_COLUMN_OPERAND &&
    (min as number) <= (max as number)
  );
}

function isSpace(value: unknown): boolean {
  return (typeof value === "number" && Number.isInteger(value) && value > 0) || value === "sm" || value === "md" || value === "lg" || value === "xl";
}

function isValid(exercise: Record<string, unknown>): exercise is SharedColumnArithmeticTestExerciseDefinition {
  if (!hasValidTags(exercise)) return false;
  if (exercise.operation !== "add" && exercise.operation !== "subtract") return false;
  if (exercise.regrouping !== undefined && exercise.regrouping !== "required" && exercise.regrouping !== "none") return false;
  if (exercise.gradeCarries !== undefined && typeof exercise.gradeCarries !== "boolean") return false;
  if (exercise.space !== undefined && !isSpace(exercise.space)) return false;

  const operands = exercise.operands;
  if (!Array.isArray(operands) || !operands.every(isOperandRange)) return false;
  const maxOperands = exercise.operation === "subtract" ? 2 : MAX_COLUMN_OPERANDS;
  if (operands.length < MIN_COLUMN_OPERANDS || operands.length > maxOperands) return false;
  // A subtraction that could never be done without going below zero.
  if (exercise.operation === "subtract" && operands[0].max < operands[1].min) return false;

  if (!exercise.locales || typeof exercise.locales !== "object") return false;
  const localeEntries = Object.entries(exercise.locales as Record<string, unknown>);
  return (
    localeEntries.length > 0 &&
    localeEntries.every(([locale, content]) => {
      if (!isLocale(locale) || !content || typeof content !== "object") return false;
      const { hint, prompt } = content as { hint?: unknown; prompt?: unknown };
      return typeof prompt === "string" && (hint === undefined || typeof hint === "string");
    })
  );
}

function resolveForPlayer(
  shared: SharedColumnArithmeticTestExerciseDefinition,
  context: ResolveForPlayerContext,
): ColumnArithmeticCourseExercise {
  return {
    gradeCarries: shared.gradeCarries ?? false,
    hint: context.hint,
    id: context.id,
    kind: "column-arithmetic",
    operands: shared.operands,
    operation: shared.operation,
    prompt: context.prompt,
    regrouping: shared.regrouping ?? "any",
    solutionSpace: shared.space ?? "md",
    tags: shared.tags,
  };
}

function buildInstance(exercise: ColumnArithmeticCourseExercise): ExerciseInstance {
  return { kind: "column-arithmetic", operands: rollColumnOperands(exercise) };
}

// The answer: what's in each box, by column (ones first). `carries[c]` is
// the small box over column c (`carries[0]` is never shown).
export type ColumnArithmeticAnswer = { carries: string[]; digits: string[] };

export function encodeColumnAnswer(answer: ColumnArithmeticAnswer): string {
  return JSON.stringify(answer);
}

export function decodeColumnAnswer(raw: string, count: number): ColumnArithmeticAnswer {
  const empty = () => Array.from({ length: count }, () => "");
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    // Not an answer yet.
  }
  const list = (value: unknown) => {
    const boxes = empty();
    if (!Array.isArray(value)) return boxes;
    return boxes.map((_box, index) => (typeof value[index] === "string" ? (value[index] as string) : ""));
  };
  const { carries, digits } = (parsed && typeof parsed === "object" ? parsed : {}) as { carries?: unknown; digits?: unknown };
  return { carries: list(carries), digits: list(digits) };
}

// Whether a box holds what's expected. Past the answer's own digits (its
// leading places) a box is right empty or 0, and so is a carry box over a
// column that gets nothing.
function boxMatches(given: string, expected: number | null): boolean {
  const value = given.trim();
  if (expected === null || expected === 0) return value === "" || value === "0";
  return value === String(expected);
}

type ColumnCheck = {
  carryParts: boolean[];
  count: number;
  digitParts: boolean[];
  expectedCarries: number[];
  resultDigits: number[];
};

function check(exercise: ColumnArithmeticCourseExercise, operands: number[], answer: ColumnArithmeticAnswer): ColumnCheck {
  const count = columnCount(exercise.operation, operands);
  const resultDigits = digitsOf(columnResult(exercise.operation, operands));
  const expectedCarries = columnCarries(exercise.operation, operands);
  return {
    carryParts: expectedCarries.map((carry, column) => column === 0 || boxMatches(answer.carries[column] ?? "", carry)),
    count,
    digitParts: Array.from({ length: count }, (_column, column) =>
      boxMatches(answer.digits[column] ?? "", column < resultDigits.length ? resultDigits[column] : null),
    ),
    expectedCarries,
    resultDigits,
  };
}

function operandsOf(instance: ExerciseInstance): number[] {
  return instance.kind === "column-arithmetic" ? instance.operands : [];
}

// Parts, for marking boxes after a check: the answer's digits by column,
// then (when carries are checked) the carry boxes by column.
function grade(exercise: ColumnArithmeticCourseExercise, instance: ExerciseInstance, rawAnswer: string): GradeResult {
  const operands = operandsOf(instance);
  const count = columnCount(exercise.operation, operands);
  const answer = decodeColumnAnswer(rawAnswer, count);

  if (answer.digits.every((digit) => !digit.trim())) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "columnArithmetic.noAnswer" };
  }

  const { carryParts, digitParts, expectedCarries, resultDigits } = check(exercise, operands, answer);
  const parts = exercise.gradeCarries ? [...digitParts, ...carryParts] : digitParts;
  if (parts.every(Boolean)) return { isCorrect: true };

  // Partial credit counts the answer's digits and, when checked, only the
  // carries there are (or wrongly written): an empty box over a column that
  // gets nothing isn't something done right.
  const countedCarries = exercise.gradeCarries
    ? carryParts.filter((_part, column) => column > 0 && (expectedCarries[column] > 0 || (answer.carries[column] ?? "").trim() !== ""))
    : [];
  const counted = [...digitParts.slice(0, resultDigits.length), ...countedCarries];
  const extraWrong = digitParts.slice(resultDigits.length).filter((part) => !part).length;

  return {
    incomplete: answer.digits.slice(0, resultDigits.length).some((digit) => !digit.trim()),
    isAnswered: true,
    isCorrect: false,
    parts,
    share: partShare(counted.filter(Boolean).length, extraWrong, counted.length),
  };
}

// The number the student wrote, as written (empty leading boxes dropped).
export function writtenNumber(digits: string[]): string {
  return [...digits]
    .reverse()
    .map((digit) => digit.trim())
    .join("")
    .replace(/^0+(?=\d)/, "");
}

function review(exercise: ColumnArithmeticCourseExercise, instance: ExerciseInstance, rawAnswer: string): ReviewPart[] {
  const operands = operandsOf(instance);
  const count = columnCount(exercise.operation, operands);
  const answer = decodeColumnAnswer(rawAnswer, count);
  const { digitParts } = check(exercise, operands, answer);
  return [
    {
      answer: writtenNumber(answer.digits),
      isCorrect: digitParts.every(Boolean),
      solution: String(columnResult(exercise.operation, operands)),
    },
  ];
}

export const columnArithmeticExerciseRuntime: ExerciseKindRuntime<
  SharedColumnArithmeticTestExerciseDefinition,
  ColumnArithmeticCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "column-arithmetic",
  resolveForPlayer,
  review,
};
