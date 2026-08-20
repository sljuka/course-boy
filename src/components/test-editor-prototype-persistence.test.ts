import { describe, expect, it } from "vitest"

import {
  fromCourseExerciseVariable,
  toCourseExerciseVariable,
} from "@/components/test-editor-prototype-persistence"
import type { PromptVariable, VariableConstraint } from "@/components/test-editor-prototype-types"

function constraint(
  type: VariableConstraint["type"],
  value: number | null = null,
): VariableConstraint {
  return { id: `c_${type}`, type, value }
}

function variable(name: string, constraints: VariableConstraint[]): PromptVariable {
  return { constraints, id: `var_${name}`, name }
}

describe("toCourseExerciseVariable", () => {
  it("aggregates min/max constraints into a plain range", () => {
    const result = toCourseExerciseVariable(
      variable("x", [constraint("min-value", 5), constraint("max-value", 20)]),
    )

    expect(result).toEqual({ max: 20, min: 5, type: "integer" })
  })

  it("carries an even-number constraint through as parity", () => {
    const result = toCourseExerciseVariable(
      variable("x", [
        constraint("min-value", 2),
        constraint("max-value", 10),
        constraint("even-number"),
      ]),
    )

    expect(result).toEqual({ max: 10, min: 2, parity: "even", type: "integer" })
  })

  it("carries an odd-number constraint through as parity", () => {
    const result = toCourseExerciseVariable(
      variable("x", [
        constraint("min-value", 1),
        constraint("max-value", 9),
        constraint("odd-number"),
      ]),
    )

    expect(result).toEqual({ max: 9, min: 1, parity: "odd", type: "integer" })
  })

  it("throws when a variable has both even and odd constraints", () => {
    expect(() =>
      toCourseExerciseVariable(
        variable("x", [constraint("even-number"), constraint("odd-number")]),
      ),
    ).toThrow(/cannot be both even and odd/)
  })

  it("throws when bounds are impossible", () => {
    expect(() =>
      toCourseExerciseVariable(
        variable("x", [constraint("min-value", 20), constraint("max-value", 5)]),
      ),
    ).toThrow(/impossible bounds/)
  })
})

describe("fromCourseExerciseVariable / toCourseExerciseVariable round trip", () => {
  it("round-trips a plain range", () => {
    const original = { max: 50, min: 10, type: "integer" as const }
    const hydrated = fromCourseExerciseVariable("x", original)

    expect(toCourseExerciseVariable(hydrated)).toEqual(original)
  })

  it("round-trips an even-parity range", () => {
    const original = { max: 8, min: 2, parity: "even" as const, type: "integer" as const }
    const hydrated = fromCourseExerciseVariable("x", original)

    expect(toCourseExerciseVariable(hydrated)).toEqual(original)
  })

  it("round-trips an odd-parity range", () => {
    const original = { max: 9, min: 1, parity: "odd" as const, type: "integer" as const }
    const hydrated = fromCourseExerciseVariable("x", original)

    expect(toCourseExerciseVariable(hydrated)).toEqual(original)
  })
})
