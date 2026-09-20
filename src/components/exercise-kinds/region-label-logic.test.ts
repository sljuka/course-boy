import { describe, expect, it } from "vitest";

import {
  createExercise,
  fromShared,
  removeRegion,
  setSvgAsset,
  toggleRegion,
  toShared,
  updateRegionAnswers,
  updateRegionLabelOffset,
  updateRegionMatchCase,
  validate,
} from "@/components/exercise-kinds/region-label-logic";
import type { RegionLabelTestExercise } from "@/components/test-editor-prototype-types";

function baseExercise(): RegionLabelTestExercise {
  return {
    id: "ex_1",
    kind: "region-label",
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
  it("appends an unmarked shape as the next region, defaulting its answer to the shape id, and removes an already-marked one", () => {
    const exercise = baseExercise();
    const marked = toggleRegion(exercise, "Hungary", "en");

    expect(marked.regions).toHaveLength(1);
    expect(marked.regions[0]).toMatchObject({ id: "Hungary", answers: { en: "Hungary" } });

    const unmarked = toggleRegion(marked, "Hungary", "en");

    expect(unmarked.regions).toEqual([]);
  });

  it("keeps sequence order — removing the middle region closes the gap", () => {
    let exercise = baseExercise();

    for (const id of ["Hungary", "Norway", "Ireland"]) {
      exercise = toggleRegion(exercise, id, "en");
    }

    expect(exercise.regions.map((region) => region.id)).toEqual(["Hungary", "Norway", "Ireland"]);

    const withoutNorway = toggleRegion(exercise, "Norway", "en");

    expect(withoutNorway.regions.map((region) => region.id)).toEqual(["Hungary", "Ireland"]);
  });

  it("assigns each new region a color not already used in this exercise", () => {
    let exercise = baseExercise();

    for (const id of ["Hungary", "Norway", "Ireland"]) {
      exercise = toggleRegion(exercise, id, "en");
    }

    const colors = exercise.regions.map((region) => region.color);

    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("removeRegion / updateRegionAnswers / updateRegionMatchCase", () => {
  it("removes a region by id", () => {
    const exercise = toggleRegion(baseExercise(), "Hungary", "en");
    const updated = removeRegion(exercise, "Hungary");

    expect(updated.regions).toEqual([]);
  });

  it("updates a region's answers for a given locale without touching others", () => {
    const exercise = toggleRegion(baseExercise(), "Hungary", "en");
    const updated = updateRegionAnswers(exercise, "Hungary", "en", "Hungary, Magyarorszag");

    expect(updated.regions[0].answers).toEqual({ en: "Hungary, Magyarorszag" });
  });

  it("toggles match-case per region", () => {
    const exercise = toggleRegion(baseExercise(), "Hungary", "en");
    const updated = updateRegionMatchCase(exercise, "Hungary", true);

    expect(updated.regions[0].matchCase).toBe(true);
  });
});

describe("updateRegionLabelOffset", () => {
  it("sets a region's manual label position without touching other regions", () => {
    let exercise = baseExercise();

    for (const id of ["Hungary", "Norway"]) {
      exercise = toggleRegion(exercise, id, "en");
    }

    const updated = updateRegionLabelOffset(exercise, "Norway", { dx: 12, dy: -34 });

    expect(updated.regions.find((region) => region.id === "Norway")?.labelOffset).toEqual({
      dx: 12,
      dy: -34,
    });
    expect(updated.regions.find((region) => region.id === "Hungary")?.labelOffset).toBeUndefined();
  });

  it("clears a region's manual position when set back to undefined", () => {
    const exercise = updateRegionLabelOffset(
      toggleRegion(baseExercise(), "Hungary", "en"),
      "Hungary",
      { dx: 5, dy: 5 },
    );

    const cleared = updateRegionLabelOffset(exercise, "Hungary", undefined);

    expect(cleared.regions[0].labelOffset).toBeUndefined();
  });
});

describe("validate", () => {
  it("reports idle for an untouched exercise", () => {
    expect(validate(baseExercise(), "en").status).toBe("idle");
  });

  it("reports an error when there's a prompt but no diagram chosen", () => {
    const exercise: RegionLabelTestExercise = {
      ...baseExercise(),
      locales: { en: { hint: "", prompt: "Name each numbered country" } },
    };

    expect(validate(exercise, "en")).toMatchObject({ status: "error" });
  });

  it("reports an error when a region has no accepted answer", () => {
    // `toggleRegion` defaults a region's answer to its own shape id, so
    // clear it explicitly to exercise the "no accepted answer" case.
    const exercise = updateRegionAnswers(
      toggleRegion(
        {
          ...baseExercise(),
          locales: { en: { hint: "", prompt: "Name each numbered country" } },
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

  it("reports Valid once a diagram is chosen, a prompt is set, and every region has an answer", () => {
    const exercise = updateRegionAnswers(
      toggleRegion(
        {
          ...baseExercise(),
          locales: { en: { hint: "", prompt: "Name each numbered country" } },
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
    const exercise: RegionLabelTestExercise = {
      id: "ex_1",
      kind: "region-label",
      locales: { en: { hint: "Think capitals", prompt: "Name each numbered country" } },
      regions: [{ color: "#bbf7d0", id: "Hungary", answers: { en: "Hungary, Magyarorszag" }, matchCase: true }],
      svgAssetFilename: "europe-abc123.svg",
      tagIds: ["geography"],
    };

    const shared = toShared(exercise);

    expect(shared).toMatchObject({
      kind: "region-label",
      regions: [
        { color: "#bbf7d0", id: "Hungary", answers: { en: ["Hungary", "Magyarorszag"] }, matchCase: true },
      ],
      svgAssetFilename: "europe-abc123.svg",
      tags: ["geography"],
    });

    const hydrated = fromShared(shared);

    expect(hydrated.regions).toEqual([
      { color: "#bbf7d0", id: "Hungary", answers: { en: "Hungary, Magyarorszag" }, matchCase: true },
    ]);
    expect(hydrated.svgAssetFilename).toBe("europe-abc123.svg");
    expect(hydrated.locales.en).toEqual({
      hint: "Think capitals",
      prompt: "Name each numbered country",
    });
  });

  it("round-trips a region's manual label offset when present", () => {
    const exercise: RegionLabelTestExercise = {
      id: "ex_1",
      kind: "region-label",
      locales: { en: { hint: "", prompt: "Name each numbered country" } },
      regions: [
        {
          color: "#fed7aa",
          id: "Norway",
          answers: { en: "Norway" },
          matchCase: false,
          labelOffset: { dx: 46.76, dy: 1371.77 },
        },
      ],
      svgAssetFilename: "europe-abc123.svg",
      tagIds: [],
    };

    const hydrated = fromShared(toShared(exercise));

    expect(hydrated.regions[0].labelOffset).toEqual({ dx: 46.76, dy: 1371.77 });
  });
});
