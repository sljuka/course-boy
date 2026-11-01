import { describe, expect, it } from "vitest"

import {
  addCard,
  addGroup,
  createExercise,
  fromShared,
  removeCard,
  removeGroup,
  setNoRightAnswer,
  toShared,
  updateCardGroup,
  updateCardText,
  updateGroupName,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/sort-groups-logic"
import type { SortGroupsTestExercise } from "@/components/test-editor-prototype-types"

// SLJ-178: groups and cards, each card's group being the answer.
function filled(): SortGroupsTestExercise {
  let exercise = updatePrompt(createExercise(["en"]), "en", "D or T?")
  exercise = updateGroupName(updateGroupName(exercise, "en", 0, "D"), "en", 1, "T")
  ;["dog", "door", "ten", "toy"].forEach((text, index) => {
    exercise = updateCardText(exercise, "en", index, text)
  })
  return exercise
}

describe("sort-groups editor", () => {
  it("is valid once groups are named, cards written, and every group has a card", () => {
    expect(validate(createExercise(["en"]), "en")).toEqual({ status: "idle" })
    expect(validate(filled(), "en").status).toBe("valid")
    expect(validate(updateGroupName(filled(), "en", 1, ""), "en").status).toBe("error")
    const emptyGroup = updateCardGroup(updateCardGroup(filled(), 2, 0), 3, 0)
    expect(validate(emptyGroup, "en")).toMatchObject({ status: "error" })
    expect(validate(setNoRightAnswer(emptyGroup, true), "en").status).toBe("valid")
  })

  it("moves a removed group's cards to the first group, and later groups up", () => {
    const three = updateGroupName(addGroup(filled()), "en", 2, "H")
    const withH = updateCardGroup(three, 3, 2)
    const removed = removeGroup(withH, 1)
    expect(removed.locales.en.groups).toEqual(["D", "H"])
    expect(removed.cardGroups).toEqual([0, 0, 0, 1])
  })

  it("adds a card to the group above it, and removes one with its picture", () => {
    expect(addCard(filled()).cardGroups).toEqual([0, 0, 1, 1, 1])
    const removed = removeCard(filled(), 0)
    expect(removed.locales.en.cards).toEqual(["door", "ten", "toy"])
    expect(removed.cardImages).toHaveLength(3)
  })

  it("round-trips through the file", () => {
    const definition = toShared(setNoRightAnswer(filled(), true))
    expect(definition).toEqual({
      cardGroups: [0, 0, 1, 1],
      kind: "sort-groups",
      locales: { en: { cards: ["dog", "door", "ten", "toy"], groups: ["D", "T"], prompt: "D or T?" } },
      noRightAnswer: true,
      tags: [],
    })
    expect(fromShared(definition)).toMatchObject({ cardImages: [null, null, null, null], listen: false, noRightAnswer: true })
  })
})
