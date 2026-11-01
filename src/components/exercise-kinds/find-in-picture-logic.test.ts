import { describe, expect, it } from "vitest"

import {
  addArea,
  createExercise,
  fromShared,
  isSmallArea,
  removeArea,
  setImage,
  toShared,
  updateArea,
  updateAreaLabel,
  updateImageAlt,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/find-in-picture-logic"

// SLJ-179: areas dragged on the picture, the first one right.
function filled() {
  let exercise = setImage(updatePrompt(createExercise(["en"]), "en", "Find the clock."), "classroom-0123456789abcdef.png")
  exercise = updateImageAlt(exercise, "en", "A classroom")
  return addArea(exercise, { x: 0.9, y: 0.2 }, { x: 0.8, y: 0.1 })
}

describe("find-in-picture editor", () => {
  it("draws an area from any corner, the first one right and later ones decoys", () => {
    const exercise = addArea(filled(), { x: 0.1, y: 0.4 }, { x: 0.3, y: 0.9 })
    expect(exercise.areas[0]).toMatchObject({ correct: true, shape: "rect" })
    expect(exercise.areas[0].x).toBeCloseTo(0.8)
    expect(exercise.areas[0].width).toBeCloseTo(0.1)
    expect(exercise.areas[1].correct).toBe(false)
    expect(exercise.locales.en.areaLabels).toEqual(["", ""])
    expect(addArea(filled(), { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.7 }).areas).toHaveLength(1)
  })

  it("is valid with a picture, its alt text and a right area", () => {
    expect(validate(createExercise(["en"]), "en")).toEqual({ status: "idle" })
    expect(validate(filled(), "en").status).toBe("valid")
    expect(validate(updateImageAlt(filled(), "en", ""), "en").status).toBe("error")
    expect(validate(updateArea(filled(), 0, { correct: false }), "en").status).toBe("error")
    expect(validate(removeArea(filled(), 0), "en").status).toBe("error")
  })

  it("flags areas too small to tap on a phone", () => {
    expect(isSmallArea(filled().areas[0])).toBe(false)
    expect(isSmallArea({ ...filled().areas[0], width: 0.03 })).toBe(true)
  })

  it("round-trips through the file", () => {
    const exercise = updateAreaLabel(filled(), "en", 0, "the clock")
    const definition = toShared(exercise)
    expect(definition).toMatchObject({
      imageAssetFilename: "classroom-0123456789abcdef.png",
      kind: "find-in-picture",
      locales: { en: { areaLabels: ["the clock"], imageAlt: "A classroom", prompt: "Find the clock." } },
    })
    expect(fromShared(definition)).toMatchObject({ areas: exercise.areas, imageAssetFilename: "classroom-0123456789abcdef.png" })
  })
})
