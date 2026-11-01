import { describe, expect, it } from "vitest"

import { getExerciseKindRuntime } from "@/lib/exercise-kinds/registry"
import { resolveSharedExerciseForPlayer } from "@/lib/exercise-kinds/registry"
import { encodeMultipleChoiceSelection } from "@/lib/exercise-kinds/multiple-choice"
import type { SharedListenChooseTestExerciseDefinition } from "@/lib/course-package"

// SLJ-175: hear a hidden word, pick the picture.
const runtime = getExerciseKindRuntime("listen-choose")

const exercise = (changes: Record<string, unknown> = {}) =>
  ({
    correctOptionIndexes: [0],
    kind: "listen-choose",
    locales: { sr: { options: ["ispod", "na", "iza"], prompt: "Poslušaj i izaberi sliku." } },
    optionImages: ["under-0123456789abcdef.png", null, "behind-0123456789abcdef.png"],
    selectionMode: "single",
    speech: { lang: "en" },
    spoken: "under",
    tags: [],
    ...changes,
  }) as unknown as SharedListenChooseTestExerciseDefinition & Record<string, unknown>

describe("listen-choose", () => {
  it("accepts a well-formed exercise", () => {
    expect(runtime.isValid(exercise())).toBe(true)
    expect(runtime.isValid(exercise({ optionImages: undefined }))).toBe(true)
  })

  it("needs something to say, its language, a right option, and a picture or nothing per option", () => {
    expect(runtime.isValid(exercise({ spoken: "  " }))).toBe(false)
    expect(runtime.isValid(exercise({ speech: undefined }))).toBe(false)
    expect(runtime.isValid(exercise({ correctOptionIndexes: [] }))).toBe(false)
    expect(runtime.isValid(exercise({ optionImages: ["a.png"] }))).toBe(false)
    expect(runtime.isValid(exercise({ optionImages: ["../secret.png", null, null] }))).toBe(false)
  })

  it("gives the player the spoken text, the options and their pictures' URLs", () => {
    const resolved = resolveSharedExerciseForPlayer(exercise(), "ex1", ["sr"], "course1")
    expect(resolved).toMatchObject({
      kind: "listen-choose",
      options: ["ispod", "na", "iza"],
      prompt: "Poslušaj i izaberi sliku.",
      speech: { lang: "en" },
      spoken: "under",
    })
    expect((resolved as { optionImageUrls: (string | null)[] }).optionImageUrls.map((url) => url === null)).toEqual([false, true, false])
  })

  it("is checked like multiple choice", () => {
    const resolved = resolveSharedExerciseForPlayer(exercise(), "ex1", ["sr"], "course1")
    const instance = runtime.buildInstance(resolved)
    expect(instance.kind).toBe("listen-choose")
    expect(runtime.grade(resolved, instance, encodeMultipleChoiceSelection([0]))).toEqual({ isCorrect: true })
    expect(runtime.grade(resolved, instance, encodeMultipleChoiceSelection([1]))).toMatchObject({ isCorrect: false })
    expect(runtime.grade(resolved, instance, "")).toMatchObject({ isAnswered: false })
  })
})
