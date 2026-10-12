import { describe, expect, it } from "vitest"

import { isBetterAttempt, scoreTestAttempt, summarizeCourseProgress, summarizeProgramProgress } from "@/lib/course-progress"

describe("summarizeCourseProgress", () => {
  const items = ["lesson-01-a", "test-01-a", "section-test-01-quiz"]

  it("counts the current steps done, and completes once all are", () => {
    expect(summarizeCourseProgress(items, undefined)).toEqual({ completedAt: null, done: 0, total: 3 })
    expect(
      summarizeCourseProgress(items, {
        steps: {
          "lesson-01-a": { doneAt: "2026-10-01T00:00:00.000Z" },
          "section-test-01-quiz": { doneAt: "2026-10-03T00:00:00.000Z" },
          "test-01-a": { doneAt: "2026-10-02T00:00:00.000Z" },
        },
      }),
    ).toEqual({ completedAt: "2026-10-03T00:00:00.000Z", done: 3, total: 3 })
  })

  it("makes a finished course unfinished when an update adds a step, and ignores removed ones", () => {
    const progress = {
      steps: {
        "lesson-01-a": { doneAt: "2026-10-01T00:00:00.000Z" },
        "lesson-09-removed": { doneAt: "2026-10-01T00:00:00.000Z" },
      },
    }

    expect(summarizeCourseProgress(["lesson-01-a", "lesson-02-new"], progress)).toEqual({
      completedAt: null,
      done: 1,
      total: 2,
    })
  })
})

describe("scoreTestAttempt", () => {
  it("counts first-try correct answers and the longest run of them", () => {
    expect(scoreTestAttempt([true, true, false, true, true, true, null])).toEqual({
      correct: 5,
      longestStreak: 3,
      total: 7,
    })
    expect(scoreTestAttempt([])).toEqual({ correct: 0, longestStreak: 0, total: 0 })
  })
})

describe("isBetterAttempt", () => {
  it("prefers a higher share right, then a longer streak", () => {
    expect(isBetterAttempt({ correct: 8, longestStreak: 2, total: 10 }, { correct: 7, longestStreak: 7, total: 10 })).toBe(true)
    expect(isBetterAttempt({ correct: 7, longestStreak: 5, total: 10 }, { correct: 7, longestStreak: 3, total: 10 })).toBe(true)
    expect(isBetterAttempt({ correct: 7, longestStreak: 3, total: 10 }, { correct: 7, longestStreak: 3, total: 10 })).toBe(false)
  })
})

describe("summarizeProgramProgress", () => {
  const courses = [
    { id: "one", stepIds: ["a", "b"] },
    { id: "two", stepIds: ["c"] },
  ];
  const done = { doneAt: "2026-10-12T10:00:00.000Z" };

  it("is not started until one of its courses is", () => {
    expect(summarizeProgramProgress(["one", "two"], courses, undefined)).toBe("not-started");
    expect(summarizeProgramProgress([], courses, {})).toBe("not-started");
  });

  it("is started once a course is opened or a step done, and finished once every course is", () => {
    expect(summarizeProgramProgress(["one", "two"], courses, { one: { startedAt: "x", steps: {} } })).toBe("started");
    expect(summarizeProgramProgress(["one", "two"], courses, { two: { steps: { c: done } } })).toBe("started");
    expect(
      summarizeProgramProgress(["one", "two"], courses, { one: { steps: { a: done, b: done } }, two: { steps: { c: done } } }),
    ).toBe("finished");
  });

  it("isn't finished while one of its courses isn't on this device", () => {
    expect(summarizeProgramProgress(["one", "three"], courses, { one: { steps: { a: done, b: done } } })).toBe("started");
  });
});
