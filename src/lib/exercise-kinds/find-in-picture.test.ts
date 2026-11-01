import { describe, expect, it } from "vitest"

import type { FindInPictureCourseExercise, PictureArea, SharedFindInPictureTestExerciseDefinition } from "@/lib/course-package"
import { areaAt, decodeFindInPictureAnswer, encodeFindInPictureAnswer } from "@/lib/exercise-kinds/find-in-picture"
import { getExerciseKindRuntime, resolveSharedExerciseForPlayer } from "@/lib/exercise-kinds/registry"

// SLJ-179: tap the right area(s) on an ordinary picture.
const runtime = getExerciseKindRuntime("find-in-picture")

const clock: PictureArea = { correct: true, height: 0.1, id: "clock", shape: "ellipse", width: 0.1, x: 0.8, y: 0.1 }
const door: PictureArea = { correct: false, height: 0.5, id: "door", shape: "rect", width: 0.2, x: 0.1, y: 0.4 }

const shared = (changes: Record<string, unknown> = {}) =>
  ({
    areas: [clock, door],
    imageAssetFilename: "classroom-0123456789abcdef.png",
    kind: "find-in-picture",
    locales: { en: { areaLabels: ["the clock", "the door"], imageAlt: "A classroom", prompt: "Find the clock." } },
    tags: [],
    ...changes,
  }) as unknown as SharedFindInPictureTestExerciseDefinition & Record<string, unknown>

const resolved = () => resolveSharedExerciseForPlayer(shared(), "ex1", ["en"], "course1") as FindInPictureCourseExercise
const answer = (areas: string[], misses: [number, number][] = []) => encodeFindInPictureAnswer({ areas, misses })

describe("find-in-picture", () => {
  it("accepts a well-formed exercise", () => {
    expect(runtime.isValid(shared())).toBe(true)
  })

  it("needs a picture, areas inside it, distinct ids and a right one", () => {
    expect(runtime.isValid(shared({ imageAssetFilename: "../x.png" }))).toBe(false)
    expect(runtime.isValid(shared({ areas: [] }))).toBe(false)
    expect(runtime.isValid(shared({ areas: [{ ...clock, x: 0.95 }, door] }))).toBe(false)
    expect(runtime.isValid(shared({ areas: [clock, { ...door, id: "clock" }] }))).toBe(false)
    expect(runtime.isValid(shared({ areas: [{ ...clock, correct: false }, door] }))).toBe(false)
  })

  it("gives the player the picture's URL, its alt text and the areas", () => {
    expect(resolved()).toMatchObject({ areaLabels: ["the clock", "the door"], imageAlt: "A classroom", kind: "find-in-picture" })
    expect(resolved().imageUrl).toContain("classroom-0123456789abcdef.png")
    // No exercise media: the picture is the exercise.
    expect("media" in resolveSharedExerciseForPlayer({ ...shared(), media: { assetFilename: "x-0123456789abcdef.png", kind: "image" } } as never, "ex1", ["en"], "c")).toBe(false)
  })

  it("finds the area tapped, or the nearest within reach", () => {
    expect(areaAt([clock, door], 0.85, 0.15)?.id).toBe("clock")
    // The ellipse's corner is outside it.
    expect(areaAt([clock, door], 0.805, 0.105)).toBeNull()
    expect(areaAt([clock, door], 0.805, 0.105, 0.02, 0.02)?.id).toBe("clock")
    expect(areaAt([clock, door], 0.05, 0.6, 0.02, 0.02)).toBeNull()
    expect(areaAt([clock, door], 0.09, 0.6, 0.02, 0.02)?.id).toBe("door")
  })

  it("is right when exactly the right areas are tapped", () => {
    const instance = runtime.buildInstance(resolved())
    expect(runtime.grade(resolved(), instance, answer(["clock"]))).toEqual({ isCorrect: true })
    expect(runtime.grade(resolved(), instance, answer([]))).toMatchObject({ isAnswered: false })
    expect(runtime.grade(resolved(), instance, answer(["clock", "door"]))).toMatchObject({ isCorrect: false, share: 0 })
    expect(runtime.grade(resolved(), instance, answer(["clock"], [[0.5, 0.5]]))).toMatchObject({ isCorrect: false })
    expect(runtime.review?.(resolved(), instance, answer(["door"]))).toEqual([
      { answer: "", isCorrect: false, solution: "the clock" },
      { answer: "the door", isCorrect: false, solution: "" },
    ])
  })

  it("reads a broken answer as nothing tapped", () => {
    expect(decodeFindInPictureAnswer("nope", [clock])).toEqual({ areas: [], misses: [] })
    expect(decodeFindInPictureAnswer(encodeFindInPictureAnswer({ areas: ["clock"], misses: [], points: { clock: [0.8, 0.1], window: [0, 0] } }), [clock]).points).toEqual({ clock: [0.8, 0.1] })
    expect(decodeFindInPictureAnswer(answer(["window"]), [clock])).toEqual({ areas: [], misses: [] })
  })
})
