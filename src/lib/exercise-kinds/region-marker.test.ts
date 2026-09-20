import { describe, expect, it } from "vitest";

import {
  cycleRegionMarkerColor,
  decodeRegionMarkerSelections,
  encodeRegionMarkerSelections,
  regionMarkerExerciseRuntime,
} from "@/lib/exercise-kinds/region-marker";
import type { RegionMarkerCourseExercise } from "@/lib/course-package";

describe("region-marker selection encoding", () => {
  it("decodes an empty/invalid raw value to no marks", () => {
    expect(decodeRegionMarkerSelections("")).toEqual({});
    expect(decodeRegionMarkerSelections("not json")).toEqual({});
  });

  it("round-trips a selection map", () => {
    const encoded = encodeRegionMarkerSelections({ Hungary: "#bbf7d0" });

    expect(decodeRegionMarkerSelections(encoded)).toEqual({ Hungary: "#bbf7d0" });
  });
});

describe("cycleRegionMarkerColor", () => {
  const usedColors = ["#bbf7d0", "#fecaca", "#bfdbfe"];

  it("cycles an unmarked shape to the first color", () => {
    const next = cycleRegionMarkerColor("", "Hungary", usedColors);

    expect(decodeRegionMarkerSelections(next)).toEqual({ Hungary: "#bbf7d0" });
  });

  it("cycles through every used color, then back to unmarked", () => {
    let raw = encodeRegionMarkerSelections({ Hungary: "#bbf7d0" });

    raw = cycleRegionMarkerColor(raw, "Hungary", usedColors);
    expect(decodeRegionMarkerSelections(raw).Hungary).toBe("#fecaca");

    raw = cycleRegionMarkerColor(raw, "Hungary", usedColors);
    expect(decodeRegionMarkerSelections(raw).Hungary).toBe("#bfdbfe");

    raw = cycleRegionMarkerColor(raw, "Hungary", usedColors);
    expect(decodeRegionMarkerSelections(raw).Hungary).toBeUndefined();
  });

  it("only changes the targeted shape's entry", () => {
    const raw = encodeRegionMarkerSelections({ Norway: "#fecaca" });
    const next = cycleRegionMarkerColor(raw, "Hungary", usedColors);

    expect(decodeRegionMarkerSelections(next)).toEqual({ Hungary: "#bbf7d0", Norway: "#fecaca" });
  });

  it("allows cycling a shape that isn't one of the exercise's designated regions", () => {
    const next = cycleRegionMarkerColor("", "France", usedColors);

    expect(decodeRegionMarkerSelections(next)).toEqual({ France: "#bbf7d0" });
  });
});

describe("region-marker isValid", () => {
  it("accepts a well-formed definition", () => {
    expect(
      regionMarkerExerciseRuntime.isValid({
        kind: "region-marker",
        locales: { en: { prompt: "Match each country to its color" } },
        regions: [
          { color: "#bbf7d0", id: "Hungary", labels: { en: "Hungary" } },
          { color: "#fecaca", id: "Norway", labels: { en: "Norway" } },
        ],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(true);
  });

  it("rejects a definition with no regions", () => {
    expect(
      regionMarkerExerciseRuntime.isValid({
        kind: "region-marker",
        locales: { en: { prompt: "Match each country to its color" } },
        regions: [],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(false);
  });

  it("rejects a definition with no SVG asset", () => {
    expect(
      regionMarkerExerciseRuntime.isValid({
        kind: "region-marker",
        locales: { en: { prompt: "Match each country to its color" } },
        regions: [{ color: "#bbf7d0", id: "Hungary", labels: { en: "Hungary" } }],
        svgAssetFilename: "",
        tags: ["geography"],
      }),
    ).toBe(false);
  });

  it("rejects a region with a malformed color", () => {
    expect(
      regionMarkerExerciseRuntime.isValid({
        kind: "region-marker",
        locales: { en: { prompt: "Match each country to its color" } },
        regions: [{ color: "green", id: "Hungary", labels: { en: "Hungary" } }],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(false);
  });

  it("rejects duplicate region ids", () => {
    expect(
      regionMarkerExerciseRuntime.isValid({
        kind: "region-marker",
        locales: { en: { prompt: "Match each country to its color" } },
        regions: [
          { color: "#bbf7d0", id: "Hungary", labels: { en: "Hungary" } },
          { color: "#fecaca", id: "Hungary", labels: { en: "Hungary again" } },
        ],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(false);
  });
});

describe("region-marker resolveForPlayer", () => {
  it("resolves the svg asset filename and each region's localized label", () => {
    const resolved = regionMarkerExerciseRuntime.resolveForPlayer(
      {
        kind: "region-marker",
        locales: { en: { prompt: "Match each country to its color" } },
        regions: [{ color: "#bbf7d0", id: "Hungary", labels: { en: "Hungary" } }],
        svgAssetFilename: "europe-abc123.svg",
        tags: [],
      },
      {
        courseId: "my-course",
        id: "ex_1",
        prompt: "Match each country to its color",
        requestedLocales: ["en"],
      },
    );

    expect(resolved.svgAssetUrl).toBe("matko-asset://my-course/europe-abc123.svg");
    expect(resolved.regions).toEqual([{ color: "#bbf7d0", id: "Hungary", label: "Hungary" }]);
  });
});

describe("region-marker grade", () => {
  const exercise: RegionMarkerCourseExercise = {
    id: "ex_1",
    kind: "region-marker",
    prompt: "Match each country to its color",
    regions: [
      { color: "#bbf7d0", id: "Hungary", label: "Hungary" },
      { color: "#fecaca", id: "Norway", label: "Norway" },
    ],
    svgAssetUrl: "matko-asset://course/map.svg",
    tags: [],
  };
  const instance = { kind: "region-marker" as const };

  it("is correct when every designated region has its own assigned color", () => {
    expect(
      regionMarkerExerciseRuntime.grade(
        exercise,
        instance,
        encodeRegionMarkerSelections({ Hungary: "#bbf7d0", Norway: "#fecaca" }),
      ),
    ).toEqual({ isCorrect: true });
  });

  it("is incorrect when an extra, non-designated shape is also colored", () => {
    expect(
      regionMarkerExerciseRuntime.grade(
        exercise,
        instance,
        encodeRegionMarkerSelections({ France: "#bfdbfe", Hungary: "#bbf7d0", Norway: "#fecaca" }),
      ),
    ).toEqual({ isAnswered: true, isCorrect: false });
  });

  it("is unanswered when nothing is marked", () => {
    expect(
      regionMarkerExerciseRuntime.grade(exercise, instance, encodeRegionMarkerSelections({})),
    ).toMatchObject({ isAnswered: false, isCorrect: false });
  });

  it("is incorrect when a region has the wrong color", () => {
    expect(
      regionMarkerExerciseRuntime.grade(
        exercise,
        instance,
        encodeRegionMarkerSelections({ Hungary: "#fecaca", Norway: "#bbf7d0" }),
      ),
    ).toEqual({ isAnswered: true, isCorrect: false });
  });

  it("is incorrect when only some regions are marked", () => {
    expect(
      regionMarkerExerciseRuntime.grade(
        exercise,
        instance,
        encodeRegionMarkerSelections({ Hungary: "#bbf7d0" }),
      ),
    ).toEqual({ isAnswered: true, isCorrect: false });
  });
});
