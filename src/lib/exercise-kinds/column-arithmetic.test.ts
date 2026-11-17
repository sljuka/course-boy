import { describe, expect, it } from "vitest"

import type { ColumnArithmeticCourseExercise, SharedColumnArithmeticTestExerciseDefinition } from "@/lib/course-package"
import type { ExerciseInstance } from "@/lib/course-player-utils"
import {
  canSatisfy,
  columnCarries,
  columnCount,
  columnResult,
  encodeColumnAnswer,
  rollColumnOperands,
  writtenNumber,
} from "@/lib/exercise-kinds/column-arithmetic"
import { getExerciseKindRuntime, resolveSharedExerciseForPlayer } from "@/lib/exercise-kinds/registry"

// SLJ-231: written addition and subtraction, column by column.
const runtime = getExerciseKindRuntime("column-arithmetic")

const shared = (changes: Record<string, unknown> = {}) =>
  ({
    kind: "column-arithmetic",
    locales: { sr: { prompt: "Izračunaj pažljivo!" } },
    operands: [
      { max: 9_999_999, min: 1_000_000 },
      { max: 999_999, min: 100_000 },
    ],
    operation: "add",
    tags: [],
    ...changes,
  }) as unknown as SharedColumnArithmeticTestExerciseDefinition & Record<string, unknown>

const exercise = (changes: Partial<ColumnArithmeticCourseExercise> = {}): ColumnArithmeticCourseExercise => ({
  ...(resolveSharedExerciseForPlayer(shared(), "ex1", ["sr"], "course1") as ColumnArithmeticCourseExercise),
  ...changes,
})

const instance = (operands: number[]): ExerciseInstance => ({ kind: "column-arithmetic", operands })

// Digits as written, left to right, into the ones-first answer.
const answer = (written: string, carries: Record<number, string> = {}, count = written.length) => {
  const digits = written.padStart(count, " ").split("").reverse().map((digit) => digit.trim())
  return encodeColumnAnswer({
    carries: Array.from({ length: count }, (_box, column) => carries[column] ?? ""),
    digits,
  })
}

describe("column-arithmetic", () => {
  it("accepts a well-formed exercise", () => {
    expect(runtime.isValid(shared())).toBe(true)
    expect(runtime.isValid(shared({ gradeCarries: true, regrouping: "required", space: "lg" }))).toBe(true)
  })

  it("needs 2 to 4 numbers to add, exactly 2 to subtract, in sensible ranges", () => {
    expect(runtime.isValid(shared({ operands: [{ max: 9, min: 0 }] }))).toBe(false)
    expect(runtime.isValid(shared({ operands: Array.from({ length: 5 }, () => ({ max: 9, min: 0 })) }))).toBe(false)
    expect(runtime.isValid(shared({ operands: [{ max: 9, min: 0 }, { max: 9, min: 0 }, { max: 9, min: 0 }], operation: "subtract" }))).toBe(false)
    expect(runtime.isValid(shared({ operands: [{ max: 5, min: 9 }, { max: 9, min: 0 }] }))).toBe(false)
    expect(runtime.isValid(shared({ operands: [{ max: 9, min: -1 }, { max: 9, min: 0 }] }))).toBe(false)
    expect(runtime.isValid(shared({ operands: [{ max: 10 ** 13, min: 0 }, { max: 9, min: 0 }] }))).toBe(false)
    // The first number can never be the bigger one: always below zero.
    expect(runtime.isValid(shared({ operands: [{ max: 50, min: 10 }, { max: 99, min: 60 }], operation: "subtract" }))).toBe(false)
    expect(runtime.isValid(shared({ operation: "multiply" }))).toBe(false)
  })

  it("gives the player its settings, with defaults for what isn't written", () => {
    expect(exercise()).toMatchObject({
      gradeCarries: false,
      kind: "column-arithmetic",
      operation: "add",
      prompt: "Izračunaj pažljivo!",
      regrouping: "any",
      solutionSpace: "md",
    })
  })

  it("works out the answer, the columns and what's carried, as on paper", () => {
    // 587 + 277 = 864: 7+7 = 14 carries 1, 8+7+1 = 16 carries 1.
    expect(columnResult("add", [587, 277])).toBe(864)
    expect(columnCarries("add", [587, 277])).toEqual([0, 1, 1])
    // Three numbers can carry 2.
    expect(columnCarries("add", [99, 99, 99])).toEqual([0, 2, 2])
    expect(columnCount("add", [99, 99, 99])).toBe(3)
    // 8503 - 1245: 3 < 5 borrows into the tens, 0 < 4+1 into the hundreds.
    expect(columnResult("subtract", [8503, 1245])).toBe(7258)
    expect(columnCarries("subtract", [8503, 1245])).toEqual([0, 1, 1, 0])
    expect(columnCount("subtract", [1000, 999])).toBe(4)
  })

  it("draws numbers in their ranges that follow the rules", () => {
    const rules = { operands: [{ max: 999, min: 100 }, { max: 999, min: 100 }], operation: "subtract" as const }
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const operands = rollColumnOperands({ ...rules, regrouping: "required" })
      expect(operands[0]).toBeGreaterThanOrEqual(operands[1])
      expect(columnCarries("subtract", operands).some((carry) => carry > 0)).toBe(true)
      const plain = rollColumnOperands({ ...rules, regrouping: "none" })
      expect(columnCarries("subtract", plain).every((carry) => carry === 0)).toBe(true)
    }
  })

  it("knows when no numbers in the ranges can follow the rules", () => {
    expect(canSatisfy({ operands: [{ max: 4, min: 0 }, { max: 4, min: 0 }], operation: "add", regrouping: "required" })).toBe(false)
    expect(canSatisfy({ operands: [{ max: 99, min: 10 }, { max: 99, min: 10 }], operation: "add", regrouping: "required" })).toBe(true)
  })

  it("is right when every digit is, empty leading boxes included", () => {
    expect(runtime.grade(exercise(), instance([587, 277]), answer("864"))).toEqual({ isCorrect: true })
    // 1000 - 999 = 1, in four boxes.
    const subtract = exercise({ operands: [{ max: 1000, min: 1000 }, { max: 999, min: 999 }], operation: "subtract" })
    expect(runtime.grade(subtract, instance([1000, 999]), answer("1", {}, 4))).toEqual({ isCorrect: true })
    expect(runtime.grade(subtract, instance([1000, 999]), answer("0001"))).toEqual({ isCorrect: true })
  })

  it("marks the wrong column and gives credit for the rest", () => {
    // 8 503 229 - 1 245 117 = 7 258 112; the student wrote 7 258 512.
    const result = runtime.grade(exercise({ operation: "subtract" }), instance([8_503_229, 1_245_117]), answer("7258512"))
    expect(result).toMatchObject({ isAnswered: true, isCorrect: false, parts: [true, true, false, true, true, true, true] })
    expect((result as { share: number }).share).toBeCloseTo(6 / 7)
  })

  it("asks for an answer when no digit is written, and notes a half-written one", () => {
    expect(runtime.grade(exercise(), instance([587, 277]), "")).toMatchObject({ isAnswered: false })
    expect(runtime.grade(exercise(), instance([587, 277]), answer("64", {}, 3))).toMatchObject({ incomplete: true, isCorrect: false })
  })

  it("checks the carries only when the teacher asks for it", () => {
    const right = answer("864", { 1: "1", 2: "1" })
    const noCarries = answer("864")
    expect(runtime.grade(exercise(), instance([587, 277]), noCarries)).toEqual({ isCorrect: true })
    expect(runtime.grade(exercise({ gradeCarries: true }), instance([587, 277]), right)).toEqual({ isCorrect: true })
    const missing = runtime.grade(exercise({ gradeCarries: true }), instance([587, 277]), noCarries)
    expect(missing).toMatchObject({ isCorrect: false, parts: [true, true, true, true, false, false] })
    // Three digits right out of three digits and two carries.
    expect((missing as { share: number }).share).toBeCloseTo(3 / 5)
  })

  it("lists the answer and the solution for the summary", () => {
    expect(runtime.review?.(exercise(), instance([587, 277]), answer("854"))).toEqual([
      { answer: "854", isCorrect: false, solution: "864" },
    ])
    expect(writtenNumber(["1", "", "", ""])).toBe("1")
  })
})
