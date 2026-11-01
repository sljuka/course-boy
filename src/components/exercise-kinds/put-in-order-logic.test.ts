import { describe, expect, it } from "vitest"

import {
  addItem,
  createExercise,
  fromShared,
  moveItem,
  removeItem,
  setListen,
  toShared,
  updateItemImage,
  updateItemText,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/put-in-order-logic"
import type { PutInOrderTestExercise } from "@/components/test-editor-prototype-types"

// SLJ-177: the order in the editor is the answer.
function filled(): PutInOrderTestExercise {
  let exercise = updatePrompt(createExercise(["en"]), "en", "Put in order.")
  ;["dig", "seed", "water"].forEach((text, index) => {
    exercise = updateItemText(exercise, "en", index, text)
  })
  return exercise
}

describe("put-in-order editor", () => {
  it("is valid once every item has text and none repeats", () => {
    expect(validate(createExercise(["en"]), "en")).toEqual({ status: "idle" })
    expect(validate(filled(), "en").status).toBe("valid")
    expect(validate(updateItemText(filled(), "en", 1, ""), "en").status).toBe("error")
    expect(validate(updateItemText(filled(), "en", 1, "Dig"), "en").status).toBe("error")
  })

  it("moves, adds and removes an item with its picture, keeping at least two", () => {
    const withPicture = updateItemImage(filled(), 0, "dig-0123456789abcdef.svg")
    const moved = moveItem(withPicture, 0, 1)
    expect(moved.locales.en.items).toEqual(["seed", "dig", "water"])
    expect(moved.images).toEqual([null, "dig-0123456789abcdef.svg", null])
    expect(moveItem(withPicture, 0, -1)).toBe(withPicture)
    expect(addItem(withPicture).images).toHaveLength(4)
    const removed = removeItem(removeItem(withPicture, 2), 1)
    expect(removed.locales.en.items).toEqual(["dig", "seed"])
  })

  it("round-trips through the file", () => {
    const exercise = setListen(filled(), true, "en")
    const definition = toShared(exercise)
    expect(definition).toEqual({
      kind: "put-in-order",
      listen: true,
      locales: { en: { items: ["dig", "seed", "water"], prompt: "Put in order." } },
      tags: [],
    })
    expect(fromShared({ ...definition, speech: { lang: "en" } } as never)).toMatchObject({
      images: [null, null, null],
      listen: true,
      locales: { en: { hint: "", items: ["dig", "seed", "water"], prompt: "Put in order." } },
      speech: { lang: "en" },
    })
  })
})
