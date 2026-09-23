import { describe, expect, it } from "vitest";

import {
  createExercise,
  fromShared,
  setSvgAsset,
  setViewBox,
  toggleCorrectShape,
  toShared,
  validate,
} from "@/components/exercise-kinds/region-picker-logic";
import type { RegionPickerTestExercise } from "@/components/test-editor-prototype-types";

function baseExercise(): RegionPickerTestExercise {
  return {
    correctShapeIds: [],
    id: "ex_1",
    kind: "region-picker",
    locales: { en: { hint: "", prompt: "" } },
    markerColor: "#bae6fd",
    svgAssetFilename: "",
    tagIds: [],
  };
}

describe("createExercise", () => {
  it("starts with no diagram and no correct shapes", () => {
    const exercise = createExercise(["en"]);

    expect(exercise.svgAssetFilename).toBe("");
    expect(exercise.correctShapeIds).toEqual([]);
  });
});

describe("setSvgAsset", () => {
  it("clears any previously marked correct shapes when the diagram is replaced", () => {
    const exercise = toggleCorrectShape(
      { ...baseExercise(), svgAssetFilename: "old.svg" },
      "Norway",
    );

    const updated = setSvgAsset(exercise, "new.svg");

    expect(updated.svgAssetFilename).toBe("new.svg");
    expect(updated.correctShapeIds).toEqual([]);
  });
});

describe("toggleCorrectShape", () => {
  it("adds an unmarked shape and removes an already-marked one", () => {
    const exercise = baseExercise();
    const marked = toggleCorrectShape(exercise, "Norway");

    expect(marked.correctShapeIds).toEqual(["Norway"]);

    const unmarked = toggleCorrectShape(marked, "Norway");

    expect(unmarked.correctShapeIds).toEqual([]);
  });
});

describe("validate", () => {
  it("reports idle for an untouched exercise", () => {
    expect(validate(baseExercise(), "en").status).toBe("idle");
  });

  it("reports an error when there's a prompt but no diagram uploaded", () => {
    const exercise: RegionPickerTestExercise = {
      ...baseExercise(),
      locales: { en: { hint: "", prompt: "Mark Scandinavia" } },
    };

    expect(validate(exercise, "en")).toMatchObject({ status: "error" });
  });

  it("reports an error when a diagram is uploaded but nothing is marked correct", () => {
    const exercise: RegionPickerTestExercise = {
      ...baseExercise(),
      locales: { en: { hint: "", prompt: "Mark Scandinavia" } },
      svgAssetFilename: "europe.svg",
    };

    expect(validate(exercise, "en")).toMatchObject({ status: "error" });
  });

  it("reports Valid once a diagram is uploaded, a prompt is set, and a region is marked", () => {
    const exercise = toggleCorrectShape(
      {
        ...baseExercise(),
        locales: { en: { hint: "", prompt: "Mark Scandinavia" } },
        svgAssetFilename: "europe.svg",
      },
      "Norway",
    );

    expect(validate(exercise, "en").status).toBe("valid")
  });
});

describe("toShared / fromShared round trip", () => {
  it("round-trips prompt, hint, svg asset, and correct shapes", () => {
    const exercise: RegionPickerTestExercise = {
      correctShapeIds: ["Norway", "Sweden"],
      id: "ex_1",
      kind: "region-picker",
      locales: { en: { hint: "Think peninsula", prompt: "Mark Scandinavia" } },
      markerColor: "#bae6fd",
      svgAssetFilename: "europe-abc123.svg",
      tagIds: ["geography"],
    };

    const shared = toShared(exercise);

    expect(shared).toMatchObject({
      correctShapeIds: ["Norway", "Sweden"],
      kind: "region-picker",
      svgAssetFilename: "europe-abc123.svg",
      tags: ["geography"],
    });

    const hydrated = fromShared(shared);

    expect(hydrated.correctShapeIds).toEqual(["Norway", "Sweden"]);
    expect(hydrated.svgAssetFilename).toBe("europe-abc123.svg");
    expect(hydrated.locales.en).toEqual({
      hint: "Think peninsula",
      prompt: "Mark Scandinavia",
    });
  });

  it("round-trips a saved viewBox, and omits it once reset", () => {
    const exercise = setViewBox(
      { ...baseExercise(), svgAssetFilename: "europe.svg" },
      "1000 2000 3000 4000",
    );

    const shared = toShared(exercise);

    expect(shared.viewBox).toBe("1000 2000 3000 4000");

    const hydrated = fromShared(shared);

    expect(hydrated.viewBox).toBe("1000 2000 3000 4000");

    const reset = setViewBox(hydrated, undefined);

    expect(toShared(reset).viewBox).toBeUndefined();
  });
});
