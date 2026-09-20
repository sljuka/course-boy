import { describe, expect, it } from "vitest";

import {
  createExercise,
  fromShared,
  removeRegion,
  setSvgAsset,
  toggleRegion,
  toShared,
  updateRegionLabel,
  validate,
} from "@/components/exercise-kinds/region-marker-logic";
import type { RegionMarkerTestExercise } from "@/components/test-editor-prototype-types";

function baseExercise(): RegionMarkerTestExercise {
  return {
    id: "ex_1",
    kind: "region-marker",
    locales: { en: { hint: "", prompt: "" } },
    regions: [],
    svgAssetFilename: "",
    tagIds: [],
  };
}

describe("createExercise", () => {
  it("starts with no diagram and no regions", () => {
    const exercise = createExercise(["en"]);

    expect(exercise.svgAssetFilename).toBe("");
    expect(exercise.regions).toEqual([]);
  });
});

describe("setSvgAsset", () => {
  it("clears any previously marked regions when the diagram is replaced", () => {
    const exercise = toggleRegion(
      { ...baseExercise(), svgAssetFilename: "old.svg" },
      "Hungary",
      "en",
    );

    const updated = setSvgAsset(exercise, "new.svg");

    expect(updated.svgAssetFilename).toBe("new.svg");
    expect(updated.regions).toEqual([]);
  });
});

describe("toggleRegion", () => {
  it("adds an unmarked shape as a region and removes an already-marked one", () => {
    const exercise = baseExercise();
    const marked = toggleRegion(exercise, "Hungary", "en");

    expect(marked.regions).toHaveLength(1);
    expect(marked.regions[0]).toMatchObject({ id: "Hungary", labels: { en: "Hungary" } });

    const unmarked = toggleRegion(marked, "Hungary", "en");

    expect(unmarked.regions).toEqual([]);
  });

  it("assigns each new region a color not already used in this exercise, while colors remain in the palette", () => {
    let exercise = baseExercise();

    for (const id of ["Hungary", "Norway", "Ireland"]) {
      exercise = toggleRegion(exercise, id, "en");
    }

    const colors = exercise.regions.map((region) => region.color);

    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("removeRegion / updateRegionLabel", () => {
  it("removes a region by id", () => {
    const exercise = toggleRegion(baseExercise(), "Hungary", "en");
    const updated = removeRegion(exercise, "Hungary");

    expect(updated.regions).toEqual([]);
  });

  it("updates a region's label for a given locale without touching others", () => {
    const exercise = toggleRegion(baseExercise(), "Hungary", "en");
    const updated = updateRegionLabel(exercise, "Hungary", "en", "Hungary");

    expect(updated.regions[0].labels).toEqual({ en: "Hungary" });
  });
});

describe("validate", () => {
  it("reports idle for an untouched exercise", () => {
    expect(validate(baseExercise(), "en").status).toBe("idle");
  });

  it("reports an error when there's a prompt but no diagram chosen", () => {
    const exercise: RegionMarkerTestExercise = {
      ...baseExercise(),
      locales: { en: { hint: "", prompt: "Match each country to its color" } },
    };

    expect(validate(exercise, "en")).toMatchObject({ status: "error" });
  });

  it("reports an error when a region has no label", () => {
    const exercise = updateRegionLabel(
      toggleRegion(
        {
          ...baseExercise(),
          locales: { en: { hint: "", prompt: "Match each country to its color" } },
          svgAssetFilename: "europe.svg",
        },
        "Hungary",
        "en",
      ),
      "Hungary",
      "en",
      "",
    );

    expect(validate(exercise, "en")).toMatchObject({ status: "error" });
  });

  it("reports Valid once a diagram is chosen, a prompt is set, and every region has a label", () => {
    const exercise = updateRegionLabel(
      toggleRegion(
        {
          ...baseExercise(),
          locales: { en: { hint: "", prompt: "Match each country to its color" } },
          svgAssetFilename: "europe.svg",
        },
        "Hungary",
        "en",
      ),
      "Hungary",
      "en",
      "Hungary",
    );

    expect(validate(exercise, "en").status).toBe("valid");
  });
});

describe("toShared / fromShared round trip", () => {
  it("round-trips prompt, hint, svg asset, and regions", () => {
    const exercise: RegionMarkerTestExercise = {
      id: "ex_1",
      kind: "region-marker",
      locales: { en: { hint: "Think capitals", prompt: "Match each country to its color" } },
      regions: [{ color: "#bbf7d0", id: "Hungary", labels: { en: "Hungary" } }],
      svgAssetFilename: "europe-abc123.svg",
      tagIds: ["geography"],
    };

    const shared = toShared(exercise);

    expect(shared).toMatchObject({
      kind: "region-marker",
      regions: [{ color: "#bbf7d0", id: "Hungary", labels: { en: "Hungary" } }],
      svgAssetFilename: "europe-abc123.svg",
      tags: ["geography"],
    });

    const hydrated = fromShared(shared);

    expect(hydrated.regions).toEqual([{ color: "#bbf7d0", id: "Hungary", labels: { en: "Hungary" } }]);
    expect(hydrated.svgAssetFilename).toBe("europe-abc123.svg");
    expect(hydrated.locales.en).toEqual({
      hint: "Think capitals",
      prompt: "Match each country to its color",
    });
  });
});
