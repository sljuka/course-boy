import { describe, expect, it } from "vitest";

import {
  decodeRegionLabelAnswers,
  encodeRegionLabelAnswers,
  regionLabelExerciseRuntime,
} from "@/lib/exercise-kinds/region-label";
import type { RegionLabelCourseExercise } from "@/lib/course-package";

describe("region-label answer encoding", () => {
  it("decodes an empty/invalid raw value to an all-blank answer set", () => {
    expect(decodeRegionLabelAnswers("", 2)).toEqual(["", ""]);
    expect(decodeRegionLabelAnswers("not json", 2)).toEqual(["", ""]);
  });

  it("round-trips an answer array", () => {
    const encoded = encodeRegionLabelAnswers(["Hungary", ""]);

    expect(decodeRegionLabelAnswers(encoded, 2)).toEqual(["Hungary", ""]);
  });
});

describe("region-label isValid", () => {
  it("accepts a well-formed definition", () => {
    expect(
      regionLabelExerciseRuntime.isValid({
        kind: "region-label",
        locales: { en: { prompt: "Name each numbered country" } },
        regions: [
          { answers: { en: ["Hungary"] }, color: "#bbf7d0", id: "Hungary", matchCase: false },
          { answers: { en: ["Norway"] }, color: "#fecaca", id: "Norway", matchCase: false },
        ],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(true);
  });

  it("rejects a definition with no regions", () => {
    expect(
      regionLabelExerciseRuntime.isValid({
        kind: "region-label",
        locales: { en: { prompt: "Name each numbered country" } },
        regions: [],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(false);
  });

  it("rejects a region with no accepted answers", () => {
    expect(
      regionLabelExerciseRuntime.isValid({
        kind: "region-label",
        locales: { en: { prompt: "Name each numbered country" } },
        regions: [{ answers: { en: [] }, color: "#bbf7d0", id: "Hungary", matchCase: false }],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(false);
  });

  it("rejects a region with a malformed color", () => {
    expect(
      regionLabelExerciseRuntime.isValid({
        kind: "region-label",
        locales: { en: { prompt: "Name each numbered country" } },
        regions: [{ answers: { en: ["Hungary"] }, color: "green", id: "Hungary", matchCase: false }],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(false);
  });

  it("rejects duplicate region ids", () => {
    expect(
      regionLabelExerciseRuntime.isValid({
        kind: "region-label",
        locales: { en: { prompt: "Name each numbered country" } },
        regions: [
          { answers: { en: ["Hungary"] }, color: "#bbf7d0", id: "Hungary", matchCase: false },
          { answers: { en: ["Hungary again"] }, color: "#fecaca", id: "Hungary", matchCase: false },
        ],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(false);
  });

  it("accepts a region with a well-formed manual label offset", () => {
    expect(
      regionLabelExerciseRuntime.isValid({
        kind: "region-label",
        locales: { en: { prompt: "Name each numbered country" } },
        regions: [
          {
            answers: { en: ["Norway"] },
            color: "#fed7aa",
            id: "Norway",
            matchCase: false,
            labelOffset: { dx: 46.76, dy: 1371.77 },
          },
        ],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(true);
  });

  it("rejects a region with a malformed manual label offset", () => {
    expect(
      regionLabelExerciseRuntime.isValid({
        kind: "region-label",
        locales: { en: { prompt: "Name each numbered country" } },
        regions: [
          {
            answers: { en: ["Norway"] },
            color: "#fed7aa",
            id: "Norway",
            matchCase: false,
            labelOffset: { dx: "46.76", dy: 1371.77 },
          },
        ],
        svgAssetFilename: "europe-abc123.svg",
        tags: ["geography"],
      }),
    ).toBe(false);
  });
});

describe("region-label resolveForPlayer", () => {
  it("resolves the svg asset filename and each region's localized answers", () => {
    const resolved = regionLabelExerciseRuntime.resolveForPlayer(
      {
        kind: "region-label",
        locales: { en: { prompt: "Name each numbered country" } },
        regions: [
          { answers: { en: ["Hungary", "Magyarorszag"] }, color: "#bbf7d0", id: "Hungary", matchCase: false },
          {
            answers: { en: ["Norway"] },
            color: "#fed7aa",
            id: "Norway",
            matchCase: false,
            labelOffset: { dx: 46.76, dy: 1371.77 },
          },
        ],
        svgAssetFilename: "europe-abc123.svg",
        tags: [],
      },
      {
        courseId: "my-course",
        id: "ex_1",
        prompt: "Name each numbered country",
        requestedLocales: ["en"],
      },
    );

    expect(resolved.svgAssetUrl).toBe("matko-asset://my-course/europe-abc123.svg");
    expect(resolved.regions).toEqual([
      { answers: ["Hungary", "Magyarorszag"], color: "#bbf7d0", id: "Hungary", matchCase: false },
      {
        answers: ["Norway"],
        color: "#fed7aa",
        id: "Norway",
        matchCase: false,
        labelOffset: { dx: 46.76, dy: 1371.77 },
      },
    ]);
  });
});

describe("region-label grade", () => {
  const exercise: RegionLabelCourseExercise = {
    id: "ex_1",
    kind: "region-label",
    prompt: "Name each numbered country",
    regions: [
      { answers: ["Hungary"], color: "#bbf7d0", id: "Hungary", matchCase: false },
      { answers: ["Norway"], color: "#fecaca", id: "Norway", matchCase: true },
    ],
    svgAssetUrl: "matko-asset://course/map.svg",
    tags: [],
  };
  const instance = { kind: "region-label" as const };

  it("is correct when every region's answer matches", () => {
    expect(
      regionLabelExerciseRuntime.grade(
        exercise,
        instance,
        encodeRegionLabelAnswers(["Hungary", "Norway"]),
      ),
    ).toEqual({ isCorrect: true });
  });

  it("is case-insensitively correct when matchCase is false", () => {
    expect(
      regionLabelExerciseRuntime.grade(
        exercise,
        instance,
        encodeRegionLabelAnswers(["hungary", "Norway"]),
      ),
    ).toEqual({ isCorrect: true });
  });

  it("is incorrect when a matchCase region's answer has the wrong case", () => {
    expect(
      regionLabelExerciseRuntime.grade(
        exercise,
        instance,
        encodeRegionLabelAnswers(["Hungary", "norway"]),
      ),
    ).toEqual({ isAnswered: true, isCorrect: false });
  });

  it("is unanswered when nothing is typed", () => {
    expect(
      regionLabelExerciseRuntime.grade(exercise, instance, encodeRegionLabelAnswers(["", ""])),
    ).toMatchObject({ isAnswered: false, isCorrect: false });
  });

  it("is incorrect when only some regions are answered", () => {
    expect(
      regionLabelExerciseRuntime.grade(
        exercise,
        instance,
        encodeRegionLabelAnswers(["Hungary", ""]),
      ),
    ).toEqual({ isAnswered: true, isCorrect: false });
  });
});
