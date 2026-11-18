import { describe, expect, it } from "vitest";

import type { CourseExercise, CourseTest } from "@/lib/course-package";
import { createSeededRandom } from "@/lib/random";
import { buildTestAttempt, fingerprintTest, formatTestCode, parseTestCode } from "@/lib/test-code";

// One exercise of every kind that draws something, all tagged so the test's
// rule picks some of them at random too.
const exercises = [
  {
    formula: "a * b",
    id: "t#1",
    kind: "numeric",
    precision: 0,
    prompt: "{{a}} × {{b}}",
    solutionSpace: "sm",
    tags: ["all"],
    variables: { a: { max: 99, min: 2, type: "integer" }, b: { max: 9, min: 2, type: "integer" } },
  },
  {
    correctOptionIndexes: [0],
    id: "t#2",
    kind: "multiple-choice",
    options: ["A", "B", "C", "D", "E", "F"],
    prompt: "Pick",
    selectionMode: "single",
    tags: ["all"],
  },
  {
    gradeCarries: false,
    id: "t#3",
    kind: "column-arithmetic",
    operands: [
      { max: 99999, min: 10000 },
      { max: 9999, min: 1000 },
    ],
    operation: "add",
    prompt: "Add",
    regrouping: "any",
    solutionSpace: "md",
    tags: ["all"],
  },
  {
    id: "t#4",
    kind: "match-pairs",
    left: ["1", "2", "3", "4", "5"],
    leftImageUrls: [null, null, null, null, null],
    listenLeft: false,
    prompt: "Match",
    right: ["one", "two", "three", "four", "five"],
    rightImageUrls: [null, null, null, null, null],
    tags: ["all"],
  },
  {
    id: "t#5",
    imageUrls: [null, null, null, null, null, null],
    items: ["a", "b", "c", "d", "e", "f"],
    kind: "put-in-order",
    listen: false,
    prompt: "Order",
    tags: ["all"],
  },
  {
    cardGroups: [0, 1, 0, 1, 0, 1],
    cardImageUrls: [null, null, null, null, null, null],
    cards: ["1", "2", "3", "4", "5", "6"],
    groups: ["odd", "even"],
    id: "t#6",
    kind: "sort-groups",
    listen: false,
    noRightAnswer: false,
    prompt: "Sort",
    tags: ["all"],
  },
] as unknown as CourseExercise[];

const test: CourseTest = {
  exercises,
  graded: false,
  id: "t",
  includeCourseExercises: false,
  partialCredit: false,
  structure: [{ count: 4, tag: "all" }],
};

describe("createSeededRandom", () => {
  it("gives the same numbers in [0, 1) for the same seed", () => {
    const first = createSeededRandom(42);
    const second = createSeededRandom(42);
    const numbers = Array.from({ length: 50 }, () => first());

    expect(Array.from({ length: 50 }, () => second())).toEqual(numbers);
    expect(numbers.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(createSeededRandom(43)()).not.toBe(numbers[0]);
  });
});

describe("test codes", () => {
  it("round-trips a seed and fingerprint through the eight characters", () => {
    for (const code of [
      { fingerprint: 0, seed: 0 },
      { fingerprint: 1023, seed: 2 ** 30 - 1 },
      { fingerprint: 517, seed: 123456789 },
    ]) {
      const text = formatTestCode(code);
      expect(text).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
      expect(parseTestCode(text)).toEqual({ code, status: "ok" });
    }
  });

  it("forgives how a code is typed: case, spaces, no dash, I/L for 1 and O for 0", () => {
    const text = formatTestCode({ fingerprint: 517, seed: 123456789 });
    const typed = text.toLowerCase().replace("-", " ");

    expect(parseTestCode(typed)).toEqual(parseTestCode(text));
    expect(parseTestCode("1O0L-IIII")).toEqual(parseTestCode("1001-1111"));
  });

  it("refuses what isn't a code", () => {
    expect(parseTestCode("")).toEqual({ status: "invalid" });
    expect(parseTestCode("K7QM-2XD")).toEqual({ status: "invalid" });
    expect(parseTestCode("K7QM-2XDPP")).toEqual({ status: "invalid" });
    expect(parseTestCode("K7QM-2XDU")).toEqual({ status: "invalid" });
  });
});

describe("buildTestAttempt", () => {
  it("rebuilds the same attempt from the same seed: exercises, numbers and order", () => {
    const first = buildTestAttempt(test, [], 123456);
    const again = buildTestAttempt(test, [], 123456);

    expect(first.exercises).toHaveLength(4);
    expect(again.exercises.map((exercise) => exercise.id)).toEqual(first.exercises.map((exercise) => exercise.id));
    expect(again.instances).toEqual(first.instances);
    expect(again.code).toEqual(first.code);
  });

  it("gives other attempts for other seeds", () => {
    const attempts = [1, 2, 3, 4, 5].map((seed) => JSON.stringify(buildTestAttempt(test, [], seed)));

    expect(new Set(attempts).size).toBeGreaterThan(1);
  });

  it("rebuilds every kind's draws, also when every exercise is in the test", () => {
    const whole = { ...test, structure: undefined };
    const kinds = buildTestAttempt(whole, [], 99).instances.map((instance) => instance.kind);

    expect(kinds).toEqual(["numeric", "multiple-choice", "column-arithmetic", "match-pairs", "put-in-order", "sort-groups"]);
    for (const seed of [7, 99, 2 ** 30 - 1]) {
      expect(buildTestAttempt(whole, [], seed)).toEqual(buildTestAttempt(whole, [], seed));
    }
  });
});

describe("fingerprintTest", () => {
  it("is the same for the same content, whatever the order of its keys", () => {
    const shuffledKeys = {
      ...test,
      exercises: test.exercises.map((exercise) =>
        Object.fromEntries(Object.entries(exercise).reverse()),
      ) as CourseExercise[],
    };

    expect(fingerprintTest(shuffledKeys)).toBe(fingerprintTest(test));
    expect(fingerprintTest(Object.fromEntries(Object.entries(test).reverse()) as CourseTest)).toBe(fingerprintTest(test));
  });

  it("is the same in every language: text doesn't decide any draw", () => {
    const inSerbian = {
      ...test,
      exercises: test.exercises.map((exercise) => ({
        ...exercise,
        prompt: `${exercise.prompt} (sr)`,
        ...("options" in exercise ? { options: exercise.options.map((option) => `${option} – sr`) } : {}),
        ...("cards" in exercise ? { cards: exercise.cards.map((card) => `${card} – ћирилица`) } : {}),
      })) as CourseExercise[],
    };

    expect(fingerprintTest(inSerbian)).toBe(fingerprintTest(test));
    expect(buildTestAttempt(inSerbian, [], 77).instances).toEqual(buildTestAttempt(test, [], 77).instances);
  });

  it("changes when what an attempt holds changes", () => {
    const changed = {
      ...test,
      exercises: test.exercises.map((exercise, index) =>
        index === 0 ? { ...exercise, variables: { a: { max: 50, min: 2, type: "integer" } } } : exercise,
      ) as CourseExercise[],
    };

    const withoutOption = {
      ...test,
      exercises: test.exercises.map((exercise) =>
        "options" in exercise ? { ...exercise, options: exercise.options.slice(1) } : exercise,
      ) as CourseExercise[],
    };
    const otherFormula = {
      ...test,
      exercises: test.exercises.map((exercise) =>
        exercise.kind === "numeric" ? { ...exercise, formula: "a + b" } : exercise,
      ) as CourseExercise[],
    };

    expect(fingerprintTest(changed)).not.toBe(fingerprintTest(test));
    expect(fingerprintTest(withoutOption)).not.toBe(fingerprintTest(test));
    expect(fingerprintTest(otherFormula)).not.toBe(fingerprintTest(test));
    expect(fingerprintTest({ ...test, structure: [{ count: 3, tag: "all" }] })).not.toBe(fingerprintTest(test));
  });
});
