import { describe, expect, it } from "vitest"

import {
  fromSharedTestExerciseDefinition,
  toSharedTestExerciseDefinition,
} from "@/components/test-editor-prototype-persistence"
import type {
  MultipleChoiceTestExercise,
  NumericTestExercise,
  RegionPickerTestExercise,
  WordTypeTestExercise,
} from "@/components/test-editor-prototype-types"
import type { SharedTestExerciseDefinition } from "@/lib/course-package"

describe("exercise kind persistence", () => {
  it("round-trips a single-answer multiple-choice exercise", () => {
    const exercise: MultipleChoiceTestExercise = {
      kind: "multiple-choice",
      correctOptionIndexes: [1],
      id: "ex_mc",
      locales: {
        en: { hint: "Think capitals", options: ["London", "Paris"], prompt: "Capital of France?" },
      },
      selectionMode: "single",
      tagIds: ["geography"],
    }

    const shared = toSharedTestExerciseDefinition(exercise)

    expect(shared).toMatchObject({
      correctOptionIndexes: [1],
      kind: "multiple-choice",
      selectionMode: "single",
      tags: ["geography"],
    })

    const hydrated = fromSharedTestExerciseDefinition(shared) as MultipleChoiceTestExercise

    expect(hydrated.kind).toBe("multiple-choice")
    expect(hydrated.correctOptionIndexes).toEqual([1])
    expect(hydrated.selectionMode).toBe("single")
    expect(hydrated.locales.en).toEqual({
      hint: "Think capitals",
      options: ["London", "Paris"],
      prompt: "Capital of France?",
    })
  })

  it("round-trips a multiple-answer multiple-choice exercise", () => {
    const exercise: MultipleChoiceTestExercise = {
      kind: "multiple-choice",
      correctOptionIndexes: [0, 2],
      id: "ex_mc_multi",
      locales: {
        en: {
          hint: "",
          options: ["Paris", "Tokyo", "Berlin", "Cairo"],
          prompt: "Which are capitals of European countries?",
        },
      },
      selectionMode: "multiple",
      tagIds: ["geography"],
    }

    const shared = toSharedTestExerciseDefinition(exercise)

    expect(shared).toMatchObject({
      correctOptionIndexes: [0, 2],
      selectionMode: "multiple",
    })

    const hydrated = fromSharedTestExerciseDefinition(shared) as MultipleChoiceTestExercise

    expect(hydrated.correctOptionIndexes).toEqual([0, 2])
    expect(hydrated.selectionMode).toBe("multiple")
  })

  it("hydrates a legacy on-disk multiple-choice exercise (single correctOptionIndex, no selectionMode)", () => {
    const legacyDefinition = {
      correctOptionIndex: 1,
      kind: "multiple-choice" as const,
      locales: {
        en: { options: ["London", "Paris"], prompt: "Capital of France?" },
      },
      tags: ["geography"],
    } as unknown as SharedTestExerciseDefinition

    const hydrated = fromSharedTestExerciseDefinition(legacyDefinition) as MultipleChoiceTestExercise

    expect(hydrated.correctOptionIndexes).toEqual([1])
    expect(hydrated.selectionMode).toBe("multiple")
  })

  it("round-trips a numeric exercise with an explicit kind", () => {
    const exercise: NumericTestExercise = {
      kind: "numeric",
      id: "ex_num",
      locales: { en: { answerPlaceholder: "", hint: "", prompt: "{{a}} + {{b}}" } },
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

  it("round-trips a region-picker exercise", () => {
    const exercise: RegionPickerTestExercise = {
      correctShapeIds: ["Norway", "Sweden"],
      id: "ex_rp",
      kind: "region-picker",
      locales: { en: { hint: "Think peninsula", prompt: "Mark Scandinavia" } },
      svgAssetFilename: "europe-abc123.svg",
      tagIds: ["geography"],
    }

    const shared = toSharedTestExerciseDefinition(exercise)

    expect(shared).toMatchObject({
      correctShapeIds: ["Norway", "Sweden"],
      kind: "region-picker",
      svgAssetFilename: "europe-abc123.svg",
      tags: ["geography"],
    })

    const hydrated = fromSharedTestExerciseDefinition(shared) as RegionPickerTestExercise

    expect(hydrated.kind).toBe("region-picker")
    expect(hydrated.correctShapeIds).toEqual(["Norway", "Sweden"])
    expect(hydrated.svgAssetFilename).toBe("europe-abc123.svg")
    expect(hydrated.locales.en).toEqual({
      hint: "Think peninsula",
      prompt: "Mark Scandinavia",
    })
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
