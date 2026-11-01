import { describe, expect, it } from "vitest"

import {
  addPair,
  createExercise,
  fromShared,
  removePair,
  setListenLeft,
  toShared,
  updateItemImage,
  updateItemText,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/match-pairs-logic"
import type { MatchPairsTestExercise } from "@/components/test-editor-prototype-types"

// SLJ-176: a pair is a row in every language, with a picture per side.
function filled(): MatchPairsTestExercise {
  let exercise = updatePrompt(createExercise(["en"]), "en", "Match.")
  ;["hot", "cold", "hungry"].forEach((text, index) => {
    exercise = updateItemText(exercise, "en", "left", index, text)
  })
  ;["beach", "snow", "pizza"].forEach((text, index) => {
    exercise = updateItemText(exercise, "en", "right", index, text)
  })
  return exercise
}

describe("match-pairs editor", () => {
  it("is valid once every item has text, and no column repeats an item", () => {
    expect(validate(createExercise(["en"]), "en")).toEqual({ status: "idle" })
    expect(validate(filled(), "en").status).toBe("valid")
    expect(validate(updateItemText(filled(), "en", "right", 2, ""), "en").status).toBe("error")
    expect(validate(updateItemText(filled(), "en", "left", 2, "Hot"), "en").status).toBe("error")
  })

  it("adds and removes a pair in every language and its pictures, keeping at least two", () => {
    const withPicture = updateItemImage(filled(), "right", 1, "snow-0123456789abcdef.svg")
    const added = addPair(withPicture)
    expect(added.locales.en.left).toHaveLength(4)
    expect(added.rightImages).toEqual([null, "snow-0123456789abcdef.svg", null, null])
    const removed = removePair(withPicture, 0)
    expect(removed.locales.en.right).toEqual(["snow", "pizza"])
    expect(removed.rightImages).toEqual(["snow-0123456789abcdef.svg", null])
    expect(removePair(removed, 0).locales.en.left).toHaveLength(2)
  })

  it("gives heard items a language", () => {
    expect(setListenLeft(filled(), true, "en")).toMatchObject({ listenLeft: true, speech: { lang: "en" } })
    expect(setListenLeft(createExercise(["sr"]), true, "sr").speech).toEqual({ lang: "sr" })
  })

  it("round-trips through the file", () => {
    const exercise = setListenLeft(updateItemImage(filled(), "right", 0, "beach-0123456789abcdef.svg"), true, "en")
    const definition = toShared(exercise)
    expect(definition).toEqual({
      kind: "match-pairs",
      listenLeft: true,
      locales: { en: { left: ["hot", "cold", "hungry"], prompt: "Match.", right: ["beach", "snow", "pizza"] } },
      rightImages: ["beach-0123456789abcdef.svg", null, null],
      tags: [],
    })
    const back = fromShared({ ...definition, speech: { lang: "en" } } as never)
    expect(back).toMatchObject({ leftImages: [null, null, null], listenLeft: true, speech: { lang: "en" } })
    expect(back.locales.en).toEqual({ hint: "", left: ["hot", "cold", "hungry"], prompt: "Match.", right: ["beach", "snow", "pizza"] })
  })
})
