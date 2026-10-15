import { describe, expect, it } from "vitest"

import {
  isBetterAttempt,
  nextSpree,
  scoreGradedAttempt,
  scoreTestAttempt,
  spreeLevel,
  summarizeCourseProgress,
  summarizeProgramProgress,
} from "@/lib/course-progress"

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

describe("scoreGradedAttempt", () => {
  it("adds up the points of the exercises solved correctly, out of all of them", () => {
    expect(
      scoreGradedAttempt([
        { isCorrect: true, points: 10 },
        { isCorrect: false, points: 30 },
        { isCorrect: true, points: 5 },
      ]),
    ).toEqual({ correct: 2, longestStreak: 1, maxPoints: 45, points: 15, total: 3 });
  });
});

describe("scoreGradedAttempt with partial credit", () => {
  it("gives a wrong exercise its share of the points, rounded", () => {
    expect(
      scoreGradedAttempt([
        { isCorrect: true, points: 10 },
        { isCorrect: false, points: 10, share: 2 / 3 },
        { isCorrect: false, points: 30 },
      ]),
    ).toMatchObject({ correct: 1, maxPoints: 50, points: 17 });
  });
});

describe("isBetterAttempt", () => {
  it("compares graded attempts by their share of the points", () => {
    expect(
      isBetterAttempt(
        { correct: 1, longestStreak: 1, maxPoints: 40, points: 30, total: 2 },
        { correct: 2, longestStreak: 2, maxPoints: 60, points: 40, total: 3 },
      ),
    ).toBe(true);
  });

  it("prefers a higher share right, then a longer streak", () => {
    expect(isBetterAttempt({ correct: 8, longestStreak: 2, total: 10 }, { correct: 7, longestStreak: 7, total: 10 })).toBe(true)
    expect(isBetterAttempt({ correct: 7, longestStreak: 5, total: 10 }, { correct: 7, longestStreak: 3, total: 10 })).toBe(true)
    expect(isBetterAttempt({ correct: 7, longestStreak: 3, total: 10 }, { correct: 7, longestStreak: 3, total: 10 })).toBe(false)
  })
})

describe("nextSpree", () => {
  it("grows on a right first try, ends on a wrong one, and keeps the best", () => {
    expect(nextSpree(undefined, true)).toEqual({ best: 1, current: 1 })
    expect(nextSpree(undefined, false)).toEqual({ best: 0, current: 0 })
    expect(nextSpree({ best: 4, current: 4 }, true)).toEqual({ best: 5, current: 5 })
    expect(nextSpree({ best: 5, current: 2 }, true)).toEqual({ best: 5, current: 3 })
    expect(nextSpree({ best: 5, current: 3 }, false)).toEqual({ best: 5, current: 0 })
  })
})

describe("spreeLevel", () => {
  it("steps up at 1, 3, 6 and 10", () => {
    expect([0, 1, 2, 3, 5, 6, 9, 10, 40].map(spreeLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4])
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
