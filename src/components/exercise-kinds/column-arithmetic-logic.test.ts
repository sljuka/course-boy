import { describe, expect, it } from "vitest"

import {
  addOperand,
  createExercise,
  formatSample,
  fromShared,
  removeOperand,
  setOperation,
  toShared,
  updateOperand,
  validate,
} from "@/components/exercise-kinds/column-arithmetic-logic"
import { getExerciseKindRuntime } from "@/lib/exercise-kinds/registry"

// SLJ-231: the editor's side of written addition and subtraction.
describe("column-arithmetic editor logic", () => {
  it("starts as a valid addition of two four-digit numbers", () => {
    const exercise = createExercise(["sr"])
    expect(exercise).toMatchObject({ operation: "add", regrouping: "any", solutionSpace: "sm" })
    expect(validate(exercise, "sr").status).toBe("valid")
    expect(getExerciseKindRuntime("column-arithmetic").isValid(toShared(exercise) as never)).toBe(true)
  })

  it("adds up to four numbers, and keeps two for a subtraction", () => {
    let exercise = createExercise(["sr"])
    exercise = addOperand(addOperand(addOperand(exercise)))
    expect(exercise.operands).toHaveLength(4)
    expect(setOperation(exercise, "subtract").operands).toHaveLength(2)
    expect(addOperand(setOperation(exercise, "subtract")).operands).toHaveLength(2)
    expect(removeOperand(createExercise(["sr"]), 0).operands).toHaveLength(2)
  })

  it("explains ranges that can't work", () => {
    const exercise = createExercise(["sr"])
    expect(validate(updateOperand(exercise, 0, { min: 9000, max: 100 }), "sr")).toMatchObject({
      message: { key: "exerciseCheck.columnArithmetic.minAboveMax", values: { number: 1 } },
      status: "error",
    })
    expect(validate(updateOperand(exercise, 0, { min: Number.NaN }), "sr")).toMatchObject({
      message: { key: "exerciseCheck.columnArithmetic.wholeNumbers" },
      status: "error",
    })
    const small = updateOperand(updateOperand(exercise, 0, { max: 4, min: 0 }), 1, { max: 4, min: 0 })
    expect(validate({ ...small, regrouping: "required" }, "sr")).toMatchObject({
      message: { key: "exerciseCheck.columnArithmetic.neverRegroups" },
      status: "error",
    })
  })

  it("saves only what isn't the default, and reads it back", () => {
    const exercise = { ...createExercise(["sr"]), gradeCarries: true, regrouping: "none" as const, solutionSpace: "xl" as const }
    const shared = toShared({ ...exercise, locales: { sr: { hint: "", prompt: "Izračunaj!" } } })
    expect(shared).toEqual({
      gradeCarries: true,
      kind: "column-arithmetic",
      locales: { sr: { prompt: "Izračunaj!" } },
      operands: [
        { max: 9999, min: 1000 },
        { max: 9999, min: 1000 },
      ],
      operation: "add",
      regrouping: "none",
      space: "xl",
      tags: [],
    })
    expect(fromShared(shared)).toMatchObject({ gradeCarries: true, regrouping: "none", solutionSpace: "xl" })
    expect(toShared(createExercise(["sr"]))).not.toHaveProperty("regrouping")
  })

  it("writes a sample in groups of three", () => {
    expect(formatSample("subtract", [8_503_229, 1_245_117])).toBe("8 503 229 − 1 245 117 = 7 258 112")
  })
})
