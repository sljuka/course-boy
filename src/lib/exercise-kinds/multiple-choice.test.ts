import { describe, expect, it } from "vitest";

import type { MultipleChoiceCourseExercise } from "@/lib/course-package";
import { encodeMultipleChoiceSelection, multipleChoiceExerciseRuntime } from "@/lib/exercise-kinds/multiple-choice";
import { partShare } from "@/lib/exercise-kinds/types";

const exercise = (correctOptionIndexes: number[]): MultipleChoiceCourseExercise => ({
  correctOptionIndexes,
  id: "mc",
  kind: "multiple-choice",
  options: ["a", "b", "c", "d"],
  prompt: "Pick",
  selectionMode: correctOptionIndexes.length > 1 ? "multiple" : "single",
  tags: [],
});
const grade = (correct: number[], picked: number[]) =>
  multipleChoiceExerciseRuntime.grade(
    exercise(correct),
    { kind: "multiple-choice" } as never,
    encodeMultipleChoiceSelection(picked),
  );

// SLJ-135: partial credit's share of a wrong answer.
describe("multiple-choice grade", () => {
  it("is right with exactly the right options", () => {
    expect(grade([0, 2], [2, 0])).toEqual({ isCorrect: true });
  });

  it("gives a share for some of several right options, a wrong pick taking one away", () => {
    expect(grade([0, 1, 2], [0, 1])).toEqual({ isAnswered: true, isCorrect: false, share: 2 / 3 });
    expect(grade([0, 1, 2], [0, 1, 3])).toEqual({ isAnswered: true, isCorrect: false, share: 1 / 3 });
    expect(grade([0, 1], [0, 1, 2, 3])).toEqual({ isAnswered: true, isCorrect: false, share: 0 });
  });

  it("has no parts with one right option", () => {
    expect(grade([1], [0])).toEqual({ isAnswered: true, isCorrect: false });
  });
});

describe("partShare", () => {
  it("is right parts less wrong ones, out of all, never below 0", () => {
    expect(partShare(3, 1, 4)).toBe(0.5);
    expect(partShare(1, 3, 4)).toBe(0);
    expect(partShare(0, 0, 0)).toBe(0);
  });
});

describe("multiple-choice review (SLJ-140)", () => {
  it("lists the options picked and the right ones", () => {
    expect(
      multipleChoiceExerciseRuntime.review!(exercise([0, 2]), { kind: "multiple-choice" } as never, encodeMultipleChoiceSelection([2, 1])),
    ).toEqual([{ answer: "b, c", isCorrect: false, solution: "a, c" }]);
  });
});
