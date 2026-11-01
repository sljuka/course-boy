import { describe, expect, it } from "vitest"

import type { MatchPairsCourseExercise, SharedMatchPairsTestExerciseDefinition } from "@/lib/course-package"
import { decodeMatchPairsAnswer, encodeMatchPairsAnswer } from "@/lib/exercise-kinds/match-pairs"
import { getExerciseKindRuntime, resolveSharedExerciseForPlayer } from "@/lib/exercise-kinds/registry"

// SLJ-176: left[i] goes with right[i]; the student pairs them by tapping.
const runtime = getExerciseKindRuntime("match-pairs")

const shared = (changes: Record<string, unknown> = {}) =>
  ({
    kind: "match-pairs",
    locales: { en: { left: ["hot", "cold", "hungry"], prompt: "Match.", right: ["beach", "snow", "pizza"] } },
    rightImages: ["beach-0123456789abcdef.svg", null, "pizza-0123456789abcdef.svg"],
    tags: [],
    ...changes,
  }) as unknown as SharedMatchPairsTestExerciseDefinition & Record<string, unknown>

const resolved = () => resolveSharedExerciseForPlayer(shared(), "ex1", ["en"], "course1") as MatchPairsCourseExercise

describe("match-pairs", () => {
  it("accepts a well-formed exercise", () => {
    expect(runtime.isValid(shared())).toBe(true)
    expect(runtime.isValid(shared({ listenLeft: true, speech: { lang: "en" } }))).toBe(true)
  })

  it("needs columns of the same length, 2 to 8 pairs, a picture or nothing per item, and a language for heard items", () => {
    expect(runtime.isValid(shared({ locales: { en: { left: ["a", "b"], prompt: "?", right: ["1"] } } }))).toBe(false)
    expect(runtime.isValid(shared({ locales: { en: { left: ["a"], prompt: "?", right: ["1"] } } }))).toBe(false)
    const nine = Array.from({ length: 9 }, (_unused, index) => `${index}`)
    expect(runtime.isValid(shared({ locales: { en: { left: nine, prompt: "?", right: nine } } }))).toBe(false)
    expect(runtime.isValid(shared({ rightImages: ["a.png"] }))).toBe(false)
    expect(runtime.isValid(shared({ leftImages: ["../secret.png", null, null] }))).toBe(false)
    expect(runtime.isValid(shared({ listenLeft: true }))).toBe(false)
  })

  it("gives the player both columns and the pictures' URLs", () => {
    expect(resolved()).toMatchObject({ kind: "match-pairs", left: ["hot", "cold", "hungry"], listenLeft: false, right: ["beach", "snow", "pizza"] })
    expect(resolved().rightImageUrls.map((url) => url === null)).toEqual([false, true, false])
    expect(resolved().leftImageUrls).toEqual([null, null, null])
  })

  it("never shows the right column lined up with the left one", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const instance = runtime.buildInstance(resolved())
      if (instance.kind !== "match-pairs") throw new Error("wrong instance")
      expect([...instance.leftOrder].sort()).toEqual([0, 1, 2])
      expect(instance.rightOrder).not.toEqual(instance.leftOrder)
    }
  })

  it("counts each right pair", () => {
    const instance = runtime.buildInstance(resolved())
    expect(runtime.grade(resolved(), instance, encodeMatchPairsAnswer([0, 1, 2]))).toEqual({ isCorrect: true })
    expect(runtime.grade(resolved(), instance, encodeMatchPairsAnswer([null, null, null]))).toMatchObject({ isAnswered: false })
    expect(runtime.grade(resolved(), instance, encodeMatchPairsAnswer([0, 2, 1]))).toMatchObject({
      isCorrect: false,
      parts: [true, false, false],
      share: 1 / 3,
    })
    expect(runtime.grade(resolved(), instance, encodeMatchPairsAnswer([0, null, null]))).toMatchObject({ incomplete: true })
    expect(runtime.review?.(resolved(), instance, encodeMatchPairsAnswer([0, 2, null]))).toEqual([
      { answer: "beach", isCorrect: true, label: "hot", solution: "beach" },
      { answer: "pizza", isCorrect: false, label: "cold", solution: "snow" },
      { answer: "", isCorrect: false, label: "hungry", solution: "pizza" },
    ])
  })

  it("reads a broken answer as nothing paired", () => {
    expect(decodeMatchPairsAnswer("nope", 2)).toEqual([null, null])
    expect(decodeMatchPairsAnswer("[0, 5]", 2)).toEqual([null, null])
  })
})
