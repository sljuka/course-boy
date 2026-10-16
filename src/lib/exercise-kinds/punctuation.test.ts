import { describe, expect, it } from "vitest";

import { punctuationExerciseRuntime } from "@/lib/exercise-kinds/punctuation";
import { encodePunctuationAnswer } from "@/lib/punctuation";

const shared = {
  kind: "punctuation" as const,
  locales: { sr: { prompt: "Upiši znake", text: "Ana reče: „Važi.“" } },
  tags: [],
};
const exercise = punctuationExerciseRuntime.resolveForPlayer(shared, {
  courseId: "c",
  id: "e1",
  prompt: "Upiši znake",
  requestedLocales: ["sr"],
});
const instance = { kind: "punctuation" as const };
const grade = (gaps: string[]) => punctuationExerciseRuntime.grade(exercise, instance, encodePunctuationAnswer(gaps));

// SLJ-145: the student places the marks; each gap is checked.
describe("punctuation exercise", () => {
  it("resolves the sentence's words and the marks of each gap", () => {
    expect(exercise.words).toEqual(["Ana", "reče", "Važi"]);
    expect(exercise.gaps).toEqual(["", "", ":„", ".“"]);
  });

  it("is right with every gap as it should be, and not answered with none placed", () => {
    expect(grade(["", "", ":„", ".“"])).toEqual({ isCorrect: true });
    expect(grade(["", "", "", ""])).toMatchObject({ isAnswered: false, isCorrect: false });
  });

  it("gives a share for the gaps right, an extra mark taking one away", () => {
    expect(grade(["", "", ":„", "."])).toEqual({
      isAnswered: true,
      isCorrect: false,
      parts: [true, true, true, false],
      share: 1 / 2,
    });
    expect(grade([",", "", ":„", "."])).toMatchObject({ share: 0 });
  });

  it("reviews the student's sentence against the correct one", () => {
    expect(punctuationExerciseRuntime.review!(exercise, instance, encodePunctuationAnswer(["", "", ":", "."]))).toEqual([
      { answer: "Ana reče: Važi.", isCorrect: false, solution: "Ana reče: „Važi.“" },
    ]);
  });

  it("is valid only with a mark to place in a written sentence", () => {
    expect(punctuationExerciseRuntime.isValid(shared)).toBe(true);
    expect(
      punctuationExerciseRuntime.isValid({ ...shared, locales: { sr: { prompt: "x", text: "Ana peva" } } }),
    ).toBe(false);
    expect(punctuationExerciseRuntime.isValid({ ...shared, marks: [1] })).toBe(false);
  });
});
