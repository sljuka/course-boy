import { describe, expect, it } from "vitest"

import {
  fromSharedTestExerciseDefinition,
  toSharedTestExerciseDefinition,
} from "@/components/test-editor-prototype-persistence"
import type {
  MultipleChoiceTestExercise,
  NumericTestExercise,
  RegionPickerTestExercise,
} from "@/components/test-editor-prototype-types"
import type { SharedTestExerciseDefinition } from "@/lib/course-package"
import { resolveSharedExerciseForPlayer } from "@/lib/exercise-kinds/registry"
import { hasValidExerciseMedia } from "@/lib/exercise-media"
import { syncSerbianLocales } from "@/lib/serbian-script"

function numericExercise(media?: NumericTestExercise["media"]): NumericTestExercise {
  return {
    kind: "numeric",
    id: "ex_num",
    locales: {
      en: { answerPlaceholder: "", hint: "", prompt: "How many slices?" },
      sr: { answerPlaceholder: "", hint: "", prompt: "Koliko parčića?" },
    },
    media,
    solution: "8",
    solutionSpace: "sm",
    tagIds: [],
    variables: [],
  }
}

describe("exercise media on disk (SLJ-56)", () => {
  it("saves an image on the exercise and its alt text into each language", () => {
    const shared = toSharedTestExerciseDefinition(
      numericExercise({
        alt: { en: "A pizza cut into 8 slices", sr: "Pica isečena na 8 delova" },
        assetFilename: "pizza-3fa1c2d9e8b7a6f5.png",
        decorative: false,
        kind: "image",
      }),
    )

    expect(shared).toMatchObject({
      locales: {
        en: { mediaAlt: "A pizza cut into 8 slices", prompt: "How many slices?" },
        sr: { mediaAlt: "Pica isečena na 8 delova", prompt: "Koliko parčića?" },
      },
      media: { assetFilename: "pizza-3fa1c2d9e8b7a6f5.png", kind: "image" },
    })
    // Relevant is the default, so it isn't written.
    expect("decorative" in (shared as { media: object }).media).toBe(false)

    const hydrated = fromSharedTestExerciseDefinition(shared) as NumericTestExercise

    expect(hydrated.media).toEqual({
      alt: { en: "A pizza cut into 8 slices", sr: "Pica isečena na 8 delova" },
      assetFilename: "pizza-3fa1c2d9e8b7a6f5.png",
      decorative: false,
      kind: "image",
    })
  })

  it("round-trips a decorative video, which keeps no alt text", () => {
    const shared = toSharedTestExerciseDefinition(
      numericExercise({ alt: { en: "ignored" }, assetFilename: "jingle-0123456789abcdef.mp4", decorative: true, kind: "video" }),
    )

    expect(shared).toMatchObject({ media: { assetFilename: "jingle-0123456789abcdef.mp4", decorative: true, kind: "video" } })
    expect(JSON.stringify(shared)).not.toContain("mediaAlt")
    expect((fromSharedTestExerciseDefinition(shared) as NumericTestExercise).media).toEqual({
      alt: {},
      assetFilename: "jingle-0123456789abcdef.mp4",
      decorative: true,
      kind: "video",
    })
  })

  it("writes nothing for an exercise without media, and reads none back", () => {
    const shared = toSharedTestExerciseDefinition(numericExercise())

    expect("media" in shared).toBe(false)
    expect(JSON.stringify(shared)).not.toContain("mediaAlt")
    expect((fromSharedTestExerciseDefinition(shared) as NumericTestExercise).media).toBeUndefined()
  })

  it("never saves media on a region exercise, whose diagram is the exercise", () => {
    const exercise = {
      kind: "region-picker",
      correctShapeIds: ["fr"],
      id: "ex_rp",
      locales: { en: { hint: "", prompt: "Click France" } },
      markerColor: "#f00",
      media: { alt: {}, assetFilename: "pizza-3fa1c2d9e8b7a6f5.png", decorative: false, kind: "image" },
      svgAssetFilename: "europe-abc123.svg",
      tagIds: [],
    } as RegionPickerTestExercise

    expect("media" in toSharedTestExerciseDefinition(exercise)).toBe(false)
  })
})

describe("exercise media for the player", () => {
  const shared = {
    correctOptionIndexes: [0],
    kind: "multiple-choice",
    locales: {
      en: { mediaAlt: "Two apples", options: ["2", "3"], prompt: "How many?" },
      sr: { mediaAlt: "  ", options: ["2", "3"], prompt: "Koliko?" },
    },
    media: { assetFilename: "apples-0123456789abcdef.png", kind: "image" },
    selectionMode: "single",
    tags: [],
  } as SharedTestExerciseDefinition

  it("resolves the asset URL and the alt text in the reader's language, falling back like the prompt", () => {
    const exercise = resolveSharedExerciseForPlayer(shared, "t#1", ["sr", "en"], "course1")

    expect(exercise.media).toEqual({
      alt: "Two apples",
      decorative: false,
      kind: "image",
      url: "matko-asset://course1/apples-0123456789abcdef.png",
    })
  })

  it("gives decorative media no alt text", () => {
    const decorative = { ...shared, media: { ...(shared as { media: object }).media, decorative: true } } as SharedTestExerciseDefinition

    expect(resolveSharedExerciseForPlayer(decorative, "t#1", ["en"], "course1").media).toMatchObject({
      alt: undefined,
      decorative: true,
    })
  })
})

describe("hasValidExerciseMedia", () => {
  it("accepts no media and well-formed media", () => {
    expect(hasValidExerciseMedia({ locales: { en: { prompt: "?" } } })).toBe(true)
    expect(
      hasValidExerciseMedia({
        locales: { en: { mediaAlt: "x", prompt: "?" } },
        media: { assetFilename: "a-0123456789abcdef.png", decorative: true, kind: "image" },
      }),
    ).toBe(true)
  })

  it("rejects a path instead of a filename, an unknown kind, or alt text that isn't text", () => {
    expect(hasValidExerciseMedia({ locales: {}, media: { assetFilename: "../secret.png", kind: "image" } })).toBe(false)
    expect(hasValidExerciseMedia({ locales: {}, media: { assetFilename: "a.mp3", kind: "audio" } })).toBe(false)
    expect(hasValidExerciseMedia({ locales: { en: { mediaAlt: 3, prompt: "?" } } })).toBe(false)
  })
})

describe("Serbian alt text", () => {
  it("is generated in the other script with the rest of the exercise's text", () => {
    const exercise = toSharedTestExerciseDefinition({
      kind: "multiple-choice",
      correctOptionIndexes: [0],
      id: "ex_mc",
      locales: {
        sr: { hint: "", options: ["Da", "Ne"], prompt: "Da li je ovo jabuka?" },
        "sr-Cyrl": { hint: "", options: ["", ""], prompt: "" },
      },
      media: { alt: { sr: "Crvena jabuka" }, assetFilename: "apple-0123456789abcdef.png", decorative: false, kind: "image" },
      selectionMode: "single",
      tagIds: [],
    } satisfies MultipleChoiceTestExercise)

    const synced = syncSerbianLocales(exercise, { source: "sr" }) as { locales: Record<string, { mediaAlt?: string }> }

    expect(synced.locales["sr-Cyrl"].mediaAlt).toBe("Црвена јабука")
  })
})
