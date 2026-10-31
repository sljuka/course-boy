import { describe, expect, it } from "vitest"

import {
  fromSharedTestExerciseDefinition,
  toSharedTestExerciseDefinition,
} from "@/components/test-editor-prototype-persistence"
import type { MultipleChoiceTestExercise, TestExercise } from "@/components/test-editor-prototype-types"
import type { ExerciseSpeech } from "@/lib/exercise-speech"
import type { SharedTestExerciseDefinition } from "@/lib/course-package"
import { resolveSharedExerciseForPlayer } from "@/lib/exercise-kinds/registry"
import { hasValidExerciseSpeech } from "@/lib/exercise-speech"

// SLJ-174: an exercise read aloud in a language, the voice being the student's.
function choice(speech?: ExerciseSpeech): TestExercise {
  return {
    correctOptionIndexes: [0],
    id: "ex_mc",
    kind: "multiple-choice",
    locales: { sr: { hint: "", options: ["ispod", "na"], prompt: "Šta znači „under“?" } },
    selectionMode: "single",
    speech,
    tagIds: [],
  } as MultipleChoiceTestExercise & { speech?: ExerciseSpeech }
}

describe("read aloud on disk (SLJ-174)", () => {
  it("saves the language on the exercise and reads it back", () => {
    const shared = toSharedTestExerciseDefinition(choice({ lang: "en" }))
    expect(shared.speech).toEqual({ lang: "en" })
    expect(fromSharedTestExerciseDefinition(shared).speech).toEqual({ lang: "en" })
  })

  it("writes nothing for an exercise that isn't read aloud", () => {
    const shared = toSharedTestExerciseDefinition(choice())
    expect("speech" in shared).toBe(false)
    expect(fromSharedTestExerciseDefinition(shared).speech).toBeUndefined()
  })

  it("passes the language to the player", () => {
    const shared = toSharedTestExerciseDefinition(choice({ lang: "en" }))
    const resolved = resolveSharedExerciseForPlayer(shared, "ex_mc", ["sr"], "course")
    expect(resolved.speech).toEqual({ lang: "en" })
  })

  it("accepts no speech or a known language, nothing else", () => {
    expect(hasValidExerciseSpeech({})).toBe(true)
    expect(hasValidExerciseSpeech({ speech: { lang: "sr" } })).toBe(true)
    expect(hasValidExerciseSpeech({ speech: { lang: "klingon" } })).toBe(false)
    expect(hasValidExerciseSpeech({ speech: "en" })).toBe(false)
    // An unknown language from a newer version is ignored when read, not kept half-valid.
    const shared = { ...toSharedTestExerciseDefinition(choice()), speech: { lang: "xx" } } as unknown as SharedTestExerciseDefinition
    expect(fromSharedTestExerciseDefinition(shared).speech).toBeUndefined()
  })
})
