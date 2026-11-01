import { describe, expect, it } from "vitest"

import type { PutInOrderCourseExercise, SharedPutInOrderTestExerciseDefinition } from "@/lib/course-package"
import { decodePutInOrderAnswer, encodePutInOrderAnswer } from "@/lib/exercise-kinds/put-in-order"
import { getExerciseKindRuntime, resolveSharedExerciseForPlayer } from "@/lib/exercise-kinds/registry"

// SLJ-177: the items are stored in the right order; the student taps them in turn.
const runtime = getExerciseKindRuntime("put-in-order")

const shared = (changes: Record<string, unknown> = {}) =>
  ({
    images: ["dig-0123456789abcdef.svg", null, null, null],
    kind: "put-in-order",
    locales: { en: { items: ["dig", "seed", "cover", "water"], prompt: "Put in order." } },
    tags: [],
    ...changes,
  }) as unknown as SharedPutInOrderTestExerciseDefinition & Record<string, unknown>

const resolved = () => resolveSharedExerciseForPlayer(shared(), "ex1", ["en"], "course1") as PutInOrderCourseExercise

describe("put-in-order", () => {
  it("accepts a well-formed exercise", () => {
    expect(runtime.isValid(shared())).toBe(true)
    expect(runtime.isValid(shared({ images: undefined, listen: true, speech: { lang: "en" } }))).toBe(true)
  })

  it("needs 2 to 10 items, a picture or nothing per item, and a language for heard items", () => {
    expect(runtime.isValid(shared({ images: undefined, locales: { en: { items: ["a"], prompt: "?" } } }))).toBe(false)
    expect(runtime.isValid(shared({ images: ["a.png"] }))).toBe(false)
    expect(runtime.isValid(shared({ images: ["../x.png", null, null, null] }))).toBe(false)
    expect(runtime.isValid(shared({ listen: true }))).toBe(false)
  })

  it("gives the player the items and the pictures' URLs", () => {
    expect(resolved()).toMatchObject({ items: ["dig", "seed", "cover", "water"], kind: "put-in-order", listen: false })
    expect(resolved().imageUrls.map((url) => url === null)).toEqual([false, true, true, true])
  })

  it("never starts already in order", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const instance = runtime.buildInstance(resolved())
      if (instance.kind !== "put-in-order") throw new Error("wrong instance")
      expect([...instance.order].sort()).toEqual([0, 1, 2, 3])
      expect(instance.order).not.toEqual([0, 1, 2, 3])
    }
  })

  it("counts each item in its place", () => {
    const instance = runtime.buildInstance(resolved())
    expect(runtime.grade(resolved(), instance, encodePutInOrderAnswer([0, 1, 2, 3]))).toEqual({ isCorrect: true })
    expect(runtime.grade(resolved(), instance, encodePutInOrderAnswer([]))).toMatchObject({ isAnswered: false })
    expect(runtime.grade(resolved(), instance, encodePutInOrderAnswer([0, 2, 1, 3]))).toMatchObject({
      parts: [true, false, false, true],
      share: 0.5,
    })
    expect(runtime.grade(resolved(), instance, encodePutInOrderAnswer([0, 1]))).toMatchObject({ incomplete: true })
    expect(runtime.review?.(resolved(), instance, encodePutInOrderAnswer([1, 0]))).toEqual([
      { answer: "seed", isCorrect: false, label: "1", solution: "dig" },
      { answer: "dig", isCorrect: false, label: "2", solution: "seed" },
      { answer: "", isCorrect: false, label: "3", solution: "cover" },
      { answer: "", isCorrect: false, label: "4", solution: "water" },
    ])
  })

  it("reads a broken answer as nothing tapped", () => {
    expect(decodePutInOrderAnswer("nope", 3)).toEqual([])
    expect(decodePutInOrderAnswer("[0, 0]", 3)).toEqual([])
    expect(decodePutInOrderAnswer("[4]", 3)).toEqual([])
  })
})
