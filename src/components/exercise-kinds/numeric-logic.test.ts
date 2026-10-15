import { describe, expect, it } from "vitest"

import {
  fromCourseExerciseVariable,
  toCourseExerciseVariable,
  validate,
  validateFormula,
} from "@/components/exercise-kinds/numeric-logic"
import type {
  NumericTestExercise,
  PromptVariable,
  VariableConstraint,
} from "@/components/test-editor-prototype-types"

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

describe("validate", () => {
  it("reports Valid for a numeric exercise with a valid formula and no tags", () => {
    // Tags are optional — they only matter to exercise randomization, which
    // is itself optional. An untagged exercise must still save cleanly.
    const exercise: NumericTestExercise = {
      kind: "numeric",
      id: "ex_num",
      locales: { en: { answerPlaceholder: "", hint: "", prompt: "{{x}} + {{y}}" } },
      solution: "x + y",
      moreSolutions: [],
      solutionSpace: "sm",
      tagIds: [],
      variables: [
        { constraints: [], id: "var_x", name: "x" },
        { constraints: [], id: "var_y", name: "y" },
      ],
    }

    expect(validate(exercise, "en").status).toBe("valid")
  })

  it("reports Valid once a tag is present", () => {
    const exercise: NumericTestExercise = {
      kind: "numeric",
      id: "ex_num",
      locales: { en: { answerPlaceholder: "", hint: "", prompt: "{{x}} + {{y}}" } },
      solution: "x + y",
      moreSolutions: [],
      solutionSpace: "sm",
      tagIds: ["easy"],
      variables: [
        { constraints: [], id: "var_x", name: "x" },
        { constraints: [], id: "var_y", name: "y" },
      ],
    }

    expect(validate(exercise, "en").status).toBe("valid")
  })
})

// SLJ-139: a later solution can use an earlier one's result.
describe("validateFormula with several solutions", () => {
  const exercise: NumericTestExercise = {
    kind: "numeric",
    id: "ex_apples",
    locales: { en: { answerPlaceholder: "", hint: "", prompt: "{{x}} {{y}} {{z}}" } },
    solution: "x * y",
    moreSolutions: [{ formula: "solution1 - z", id: "s2" }],
    solutionSpace: "sm",
    tagIds: [],
    variables: [
      { constraints: [{ id: "a", type: "min-value", value: 4 }, { id: "b", type: "max-value", value: 4 }], id: "vx", name: "x" },
      { constraints: [{ id: "c", type: "min-value", value: 3 }, { id: "d", type: "max-value", value: 3 }], id: "vy", name: "y" },
      { constraints: [{ id: "e", type: "min-value", value: 2 }, { id: "f", type: "max-value", value: 2 }], id: "vz", name: "z" },
    ],
  }

  it("takes an earlier solution's result, with a sample computed from it", () => {
    expect(validateFormula(exercise, "en", "solution1 - z", 1)).toMatchObject({ sampleResult: 10, status: "valid" })
  })

  it("doesn't know a solution that isn't above it", () => {
    expect(validateFormula(exercise, "en", "solution1 + 1", 0)).toMatchObject({ status: "error" })
    expect(validateFormula(exercise, "en", "solution2 + 1", 1)).toMatchObject({ status: "error" })
  })
})
