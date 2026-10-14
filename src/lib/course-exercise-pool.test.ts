import { describe, expect, it } from "vitest";

import {
  buildCourseExercisePool,
  isExerciseCount,
  listCourseTests,
  pickRoundRobin,
  summarizeCourseExercisePool,
} from "@/lib/course-exercise-pool";
import type { CourseExercise, CourseTest } from "@/lib/course-package";

const exercise = (id: string) => ({ id }) as CourseExercise;
const test = (id: string, exerciseIds: string[], extra: Partial<CourseTest> = {}): CourseTest => ({
  exercises: exerciseIds.map(exercise),
  graded: false,
  id,
  includeCourseExercises: false,
  ...extra,
});
const ids = (exercises: CourseExercise[]) => exercises.map((item) => item.id);

describe("listCourseTests", () => {
  it("lists each section's lesson tests, then its own tests", () => {
    const sections = [
      { lessons: [{ test: test("t-a", []) }, { test: null }], tests: [{ test: test("s-1", []) }] },
      { lessons: [{ test: test("t-b", []) }], tests: [] },
    ] as never;

    expect(listCourseTests(sections).map((item) => item.id)).toEqual(["t-a", "s-1", "t-b"]);
  });
});

describe("buildCourseExercisePool", () => {
  it("takes every test's exercises in course order, the final test's own among them", () => {
    const final = test("final", ["f1"], { includeCourseExercises: true });
    const pool = buildCourseExercisePool(final, [test("a", ["a1", "a2"]), final, test("b", ["b1"])]);

    expect(pool.map((source) => source.testId)).toEqual(["a", "final", "b"]);
  });

  it("leaves out other final tests and empty tests, and uses the test as given (a preview's)", () => {
    const saved = test("final", ["old"], { includeCourseExercises: true });
    const edited = test("final", ["new"], { includeCourseExercises: true });
    const otherFinal = test("review", ["r1"], { includeCourseExercises: true });
    const pool = buildCourseExercisePool(edited, [test("a", ["a1"]), test("empty", []), otherFinal, saved]);

    expect(pool.map((source) => [source.testId, ids(source.exercises)])).toEqual([
      ["a", ["a1"]],
      ["final", ["new"]],
    ]);
  });
});

describe("pickRoundRobin", () => {
  const sources = [
    { exercises: ["a1", "a2", "a3", "a4"].map(exercise), testId: "a" },
    { exercises: ["b1"].map(exercise), testId: "b" },
    { exercises: ["c1", "c2", "c3"].map(exercise), testId: "c" },
  ];

  it("takes one from each test in turn, skipping a test that runs out, in the tests' order", () => {
    const picked = ids(pickRoundRobin(sources, 6, () => 0));

    expect(picked.filter((id) => id.startsWith("a"))).toHaveLength(3);
    expect(picked.filter((id) => id.startsWith("b"))).toHaveLength(1);
    expect(picked.filter((id) => id.startsWith("c"))).toHaveLength(2);
    expect(picked.map((id) => id[0])).toEqual(["a", "a", "a", "b", "c", "c"]);
  });

  it("gives the extra one to the test the turn starts at", () => {
    const fromC = ids(pickRoundRobin(sources, 4, () => 0.9));

    expect(fromC.filter((id) => id.startsWith("c"))).toHaveLength(2);
    expect(fromC.filter((id) => id.startsWith("a"))).toHaveLength(1);
  });

  it("takes them all when the count is more than there are", () => {
    expect(pickRoundRobin(sources, 50)).toHaveLength(8);
  });
});

describe("isExerciseCount", () => {
  it("is a whole number from 1 to 500", () => {
    expect([1, 500].every(isExerciseCount)).toBe(true);
    expect([0, 501, 2.5, "3"].some(isExerciseCount)).toBe(false);
  });
});

describe("summarizeCourseExercisePool", () => {
  it("counts the other tests as saved and this one as edited, leaving out other final tests", () => {
    const courseTests = [
      test("a", ["a1", "a2"]),
      test("final", ["old1", "old2", "old3"], { includeCourseExercises: true }),
      test("review", ["r1"], { includeCourseExercises: true }),
      test("empty", []),
    ];

    expect(summarizeCourseExercisePool("final", 1, courseTests)).toEqual({ exercises: 3, tests: 2 });
    expect(summarizeCourseExercisePool("final", 0, courseTests)).toEqual({ exercises: 2, tests: 1 });
  });
});
