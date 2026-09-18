import { describe, expect, it } from "vitest";

import {
  decodeRegionPickerSelection,
  encodeRegionPickerSelection,
  regionPickerExerciseRuntime,
} from "@/lib/exercise-kinds/region-picker";
import type { RegionPickerCourseExercise } from "@/lib/course-package";

describe("region-picker selection encoding", () => {
  it("decodes an empty/invalid raw value to no selection", () => {
    expect(decodeRegionPickerSelection("")).toEqual([]);
    expect(decodeRegionPickerSelection("not json")).toEqual([]);
  });

  it("round-trips a selection array", () => {
    const encoded = encodeRegionPickerSelection(["Norway", "Sweden"]);

    expect(decodeRegionPickerSelection(encoded)).toEqual(["Norway", "Sweden"]);
  });
});

describe("region-picker isValid", () => {
  it("accepts a well-formed definition", () => {
    expect(
      regionPickerExerciseRuntime.isValid({
        correctShapeIds: ["Norway", "Sweden"],
        kind: "region-picker",
        locales: { en: { prompt: "Mark Scandinavia" } },
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(true);
  });

  it("rejects a definition with no correct shapes", () => {
    expect(
      regionPickerExerciseRuntime.isValid({
        correctShapeIds: [],
        kind: "region-picker",
        locales: { en: { prompt: "Mark Scandinavia" } },
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(false);
  });

  it("rejects a definition with no SVG asset", () => {
    expect(
      regionPickerExerciseRuntime.isValid({
        correctShapeIds: ["Norway"],
        kind: "region-picker",
        locales: { en: { prompt: "Mark Scandinavia" } },
        svgAssetFilename: "",
        tags: ["geography"],
      }),
    ).toBe(false);
  });
});

describe("region-picker resolveForPlayer", () => {
  it("resolves the svg asset filename into a full matko-asset:// URL", () => {
    const resolved = regionPickerExerciseRuntime.resolveForPlayer(
      {
        correctShapeIds: ["Norway"],
        kind: "region-picker",
        locales: { en: { prompt: "Mark Norway" } },
        svgAssetFilename: "europe-abc123.svg",
        tags: [],
      },
      {
        courseId: "my-course",
        id: "ex_1",
        prompt: "Mark Norway",
        requestedLocales: ["en"],
      },
    );

    expect(resolved.svgAssetUrl).toBe("matko-asset://my-course/europe-abc123.svg");
    expect(resolved.correctShapeIds).toEqual(["Norway"]);
  });
});

describe("region-picker grade", () => {
  const exercise: RegionPickerCourseExercise = {
    correctShapeIds: ["Norway", "Sweden"],
    id: "ex_1",
    kind: "region-picker",
    prompt: "Mark Scandinavia",
    svgAssetUrl: "matko-asset://course/map.svg",
    tags: [],
  };
  const instance = { kind: "region-picker" as const };

  it("is correct when the exact set of correct shapes is selected, in any order", () => {
    expect(
      regionPickerExerciseRuntime.grade(
        exercise,
        instance,
        encodeRegionPickerSelection(["Sweden", "Norway"]),
      ),
    ).toEqual({ isCorrect: true });
  });

  it("is unanswered when nothing is selected", () => {
    expect(regionPickerExerciseRuntime.grade(exercise, instance, "")).toMatchObject({
      isAnswered: false,
      isCorrect: false,
    });
  });

  it("is incorrect when missing a correct shape", () => {
    expect(
      regionPickerExerciseRuntime.grade(exercise, instance, encodeRegionPickerSelection(["Norway"])),
    ).toEqual({ isAnswered: true, isCorrect: false });
  });

  it("is incorrect when an extra, non-correct shape is also selected", () => {
    expect(
      regionPickerExerciseRuntime.grade(
        exercise,
        instance,
        encodeRegionPickerSelection(["Norway", "Sweden", "Finland"]),
      ),
    ).toEqual({ isAnswered: true, isCorrect: false });
  });
});
