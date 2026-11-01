import { describe, expect, it } from "vitest"

import type { SharedSortGroupsTestExerciseDefinition, SortGroupsCourseExercise } from "@/lib/course-package"
import { decodeSortGroupsAnswer, encodeSortGroupsAnswer } from "@/lib/exercise-kinds/sort-groups"
import { getExerciseKindRuntime, resolveSharedExerciseForPlayer } from "@/lib/exercise-kinds/registry"

// SLJ-178: every card from one pile into its group.
const runtime = getExerciseKindRuntime("sort-groups")

const shared = (changes: Record<string, unknown> = {}) =>
  ({
    cardGroups: [0, 0, 1, 1],
    cardImages: ["dog-0123456789abcdef.svg", null, null, null],
    kind: "sort-groups",
    locales: { en: { cards: ["dog", "door", "ten", "toy"], groups: ["D", "T"], prompt: "D or T?" } },
    tags: [],
    ...changes,
  }) as unknown as SharedSortGroupsTestExerciseDefinition & Record<string, unknown>

const resolved = (changes: Record<string, unknown> = {}) =>
  resolveSharedExerciseForPlayer(shared(changes), "ex1", ["en"], "course1") as SortGroupsCourseExercise

describe("sort-groups", () => {
  it("accepts a well-formed exercise", () => {
    expect(runtime.isValid(shared())).toBe(true)
    expect(runtime.isValid(shared({ listen: true, noRightAnswer: true, speech: { lang: "en" } }))).toBe(true)
  })

  it("needs 2 to 4 groups, a group for every card, a picture or nothing per card, and a language for heard cards", () => {
    expect(runtime.isValid(shared({ locales: { en: { cards: ["a", "b", "c", "d"], groups: ["D"], prompt: "?" } } }))).toBe(false)
    expect(runtime.isValid(shared({ cardGroups: [0, 0, 1] }))).toBe(false)
    expect(runtime.isValid(shared({ cardGroups: [0, 0, 1, 2] }))).toBe(false)
    expect(runtime.isValid(shared({ cardImages: ["a.png"] }))).toBe(false)
    expect(runtime.isValid(shared({ listen: true }))).toBe(false)
  })

  it("gives the player the groups, the cards and the pictures' URLs", () => {
    expect(resolved()).toMatchObject({ cardGroups: [0, 0, 1, 1], cards: ["dog", "door", "ten", "toy"], groups: ["D", "T"], noRightAnswer: false })
    expect(resolved().cardImageUrls.map((url) => url === null)).toEqual([false, true, true, true])
  })

  it("counts each card in its group", () => {
    const instance = runtime.buildInstance(resolved())
    expect(runtime.grade(resolved(), instance, encodeSortGroupsAnswer([0, 0, 1, 1]))).toEqual({ isCorrect: true })
    expect(runtime.grade(resolved(), instance, encodeSortGroupsAnswer([null, null, null, null]))).toMatchObject({ isAnswered: false })
    expect(runtime.grade(resolved(), instance, encodeSortGroupsAnswer([0, 1, 1, null]))).toMatchObject({
      incomplete: true,
      parts: [true, false, true, false],
      share: 0.5,
    })
    expect(runtime.review?.(resolved(), instance, encodeSortGroupsAnswer([1, 0, 1, 1]))?.[0]).toEqual({
      answer: "T",
      isCorrect: false,
      label: "dog",
      solution: "D",
    })
  })

  it("with no right answer, any sorting of every card is right", () => {
    const open = resolved({ noRightAnswer: true })
    const instance = runtime.buildInstance(open)
    expect(runtime.grade(open, instance, encodeSortGroupsAnswer([1, 1, 0, 0]))).toEqual({ isCorrect: true })
    expect(runtime.grade(open, instance, encodeSortGroupsAnswer([1, null, 0, 0]))).toMatchObject({ incomplete: true, isCorrect: false })
  })

  it("reads a broken answer as every card in the pile", () => {
    expect(decodeSortGroupsAnswer("nope", 2, 2)).toEqual([null, null])
    expect(decodeSortGroupsAnswer("[0, 2]", 2, 2)).toEqual([null, null])
  })
})
