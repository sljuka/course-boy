import { describe, expect, it } from "vitest";

import {
  DEFAULT_GRADE_BANDS,
  exercisePoints,
  gradeBandColor,
  isExercisePoints,
  isGradeBands,
  joinGradeBands,
  resolveGradeBands,
  scorePercent,
  splitGradeBands,
} from "@/lib/grade-bands";

describe("exercise points", () => {
  it("defaults to 10, and allows whole numbers from 1 to 100", () => {
    expect(exercisePoints({})).toBe(10);
    expect(exercisePoints({ points: 25 })).toBe(25);
    expect([1, 100].every(isExercisePoints)).toBe(true);
    expect([0, 101, 2.5, "5", null].some(isExercisePoints)).toBe(false);
  });
});

describe("scorePercent", () => {
  it("rounds to a whole percent, and is 0 with no points to earn", () => {
    expect(scorePercent(66, 88)).toBe(75);
    expect(scorePercent(946, 1000)).toBe(95);
    expect(scorePercent(0, 0)).toBe(0);
  });
});

describe("gradeBandColor", () => {
  it("picks the highest band reached, grey below the lowest", () => {
    expect(gradeBandColor(100, DEFAULT_GRADE_BANDS)).toBe("gold");
    expect(gradeBandColor(95, DEFAULT_GRADE_BANDS)).toBe("gold");
    expect(gradeBandColor(94, DEFAULT_GRADE_BANDS)).toBe("green");
    expect(gradeBandColor(55, DEFAULT_GRADE_BANDS)).toBe("yellow");
    expect(gradeBandColor(54, DEFAULT_GRADE_BANDS)).toBe("grey");
  });

  it("doesn't depend on the order the bands are stored in", () => {
    const bands = [
      { color: "blue" as const, min: 50 },
      { color: "gold" as const, min: 100 },
      { color: "green" as const, min: 75 },
    ];

    expect(gradeBandColor(80, bands)).toBe("green");
    expect(gradeBandColor(99, bands)).toBe("green");
    expect(gradeBandColor(49, bands)).toBe("grey");
  });
});

describe("isGradeBands", () => {
  it("takes 1 to 8 bands with known colours and distinct whole minimums", () => {
    expect(isGradeBands(DEFAULT_GRADE_BANDS)).toBe(true);
    expect(isGradeBands([])).toBe(false);
    expect(isGradeBands([{ color: "pink", min: 50 }])).toBe(false);
    expect(isGradeBands([{ color: "gold", min: 101 }])).toBe(false);
    expect(isGradeBands([{ color: "gold", min: 50 }, { color: "green", min: 50 }])).toBe(false);
    expect(isGradeBands(Array.from({ length: 9 }, (_, min) => ({ color: "gold", min })))).toBe(false);
  });
});

describe("resolveGradeBands", () => {
  it("uses the test's own, else the course's, else the defaults, highest first", () => {
    const course = [{ color: "green" as const, min: 50 }, { color: "gold" as const, min: 90 }];
    const test = [{ color: "blue" as const, min: 60 }];

    expect(resolveGradeBands(test, course)).toEqual(test);
    expect(resolveGradeBands(undefined, course).map((band) => band.min)).toEqual([90, 50]);
    expect(resolveGradeBands(null, null)).toEqual(DEFAULT_GRADE_BANDS);
  });
});

describe("the colour below the lowest band", () => {
  it("is a band from 0%, grey when there's none", () => {
    const bands = [{ color: "green" as const, min: 60 }, { color: "blue" as const, min: 0 }];

    expect(splitGradeBands(bands)).toEqual({ bands: [{ color: "green", min: 60 }], belowColor: "blue" });
    expect(splitGradeBands(DEFAULT_GRADE_BANDS).belowColor).toBe("grey");
    expect(gradeBandColor(10, bands)).toBe("blue");
  });

  it("needs no band of its own when grey", () => {
    expect(joinGradeBands([{ color: "green", min: 60 }], "grey")).toEqual([{ color: "green", min: 60 }]);
    expect(joinGradeBands([{ color: "green", min: 60 }], "blue")).toEqual([
      { color: "green", min: 60 },
      { color: "blue", min: 0 },
    ]);
  });
});
