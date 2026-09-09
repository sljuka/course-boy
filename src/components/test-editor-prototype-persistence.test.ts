import { describe, expect, it } from "vitest"

import {
  fromSharedTestExerciseDefinition,
  toSharedTestExerciseDefinition,
} from "@/components/test-editor-prototype-persistence"
import type {
  MultipleChoiceTestExercise,
  NumericTestExercise,
  WordTypeTestExercise,
} from "@/components/test-editor-prototype-types"
import type { SharedTestExerciseDefinition } from "@/lib/course-package"

describe("exercise kind persistence", () => {
  it("round-trips a multiple-choice exercise", () => {
    const exercise: MultipleChoiceTestExercise = {
      kind: "multiple-choice",
      correctOptionIndex: 1,
      id: "ex_mc",
      locales: {
        en: { hint: "Think capitals", options: ["London", "Paris"], prompt: "Capital of France?" },
      },
      tagIds: ["geography"],
    }

    const shared = toSharedTestExerciseDefinition(exercise)

    expect(shared).toMatchObject({
      correctOptionIndex: 1,
      kind: "multiple-choice",
      tags: ["geography"],
    })

    const hydrated = fromSharedTestExerciseDefinition(shared) as MultipleChoiceTestExercise

    expect(hydrated.kind).toBe("multiple-choice")
    expect(hydrated.correctOptionIndex).toBe(1)
    expect(hydrated.locales.en).toEqual({
      hint: "Think capitals",
      options: ["London", "Paris"],
      prompt: "Capital of France?",
    })
  })

  it("round-trips a numeric exercise with an explicit kind", () => {
    const exercise: NumericTestExercise = {
      kind: "numeric",
      id: "ex_num",
      locales: { en: { hint: "", prompt: "{{a}} + {{b}}" } },
      solution: "a + b",
      tagIds: ["easy"],
      variables: [
        {
          constraints: [
            { id: "c1", type: "min-value", value: 1 },
            { id: "c2", type: "max-value", value: 10 },
          ],
          id: "var_a",
          name: "a",
        },
      ],
    }

    const shared = toSharedTestExerciseDefinition(exercise)

    expect(shared.kind).toBe("numeric")

    const hydrated = fromSharedTestExerciseDefinition(shared) as NumericTestExercise

    expect(hydrated.kind).toBe("numeric")
    expect(hydrated.solution).toBe("a + b")
  })

  it("round-trips a word-types exercise", () => {
    const exercise: WordTypeTestExercise = {
      kind: "word-types",
      id: "ex_wt",
      locales: {
        en: {
          hint: "",
          prompt: "Mark the nouns and verbs",
          text: "Mike{{n}} is jumping{{v}} over the fence{{n}}.",
        },
      },
      tagIds: ["grammar"],
      wordTypes: [
        { color: "sky", icon: "🟦", id: "wt_noun", names: { en: "Noun" }, symbol: "n" },
        { color: "rose", icon: "🟥", id: "wt_verb", names: { en: "Verb" }, symbol: "v" },
      ],
    }

    const shared = toSharedTestExerciseDefinition(exercise)

    expect(shared).toMatchObject({
      kind: "word-types",
      tags: ["grammar"],
    })

    const hydrated = fromSharedTestExerciseDefinition(shared) as WordTypeTestExercise

    expect(hydrated.kind).toBe("word-types")
    expect(hydrated.locales.en.text).toBe(
      "Mike{{n}} is jumping{{v}} over the fence{{n}}.",
    )
    expect(hydrated.wordTypes).toEqual(exercise.wordTypes)
  })

  it("defaults a missing `kind` (pre-multiple-choice on-disk files) to numeric", () => {
    const legacyDefinition = {
      locales: { en: { prompt: "{{a}} + {{b}}" } },
      solution: { formula: "a + b", precision: 0 },
      tags: ["easy"],
      variables: { a: { max: 10, min: 1, type: "integer" as const } },
    } as unknown as SharedTestExerciseDefinition

    const hydrated = fromSharedTestExerciseDefinition(legacyDefinition) as NumericTestExercise

    expect(hydrated.kind).toBe("numeric")
    expect(hydrated.solution).toBe("a + b")
  })
})
