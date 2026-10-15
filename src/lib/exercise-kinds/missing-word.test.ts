import { describe, expect, it } from "vitest";

import type { MissingWordCourseExercise } from "@/lib/course-package";
import {
  decodeMissingWordAnswers,
  encodeMissingWordAnswers,
  missingWordExerciseRuntime,
} from "@/lib/exercise-kinds/missing-word";

const instance = { kind: "missing-word" as const };

function buildExercise(): MissingWordCourseExercise {
  return {
    id: "ex_1",
    kind: "missing-word",
    prompt: "Fill in the missing words",
    segments: [
      { kind: "text", value: "The capital of France is " },
      { kind: "blank", variableName: "c1" },
      { kind: "text", value: ". Capital of Serbia is " },
      { kind: "blank", variableName: "c2" },
      { kind: "text", value: "." },
    ],
    tags: ["geography"],
    variables: [
      { answers: ["Paris"], matchCase: true, name: "c1" },
      { answers: ["Belgrade"], matchCase: false, name: "c2" },
    ],
  };
}

describe("encodeMissingWordAnswers / decodeMissingWordAnswers", () => {
  it("round-trips a valid answer array", () => {
    const encoded = encodeMissingWordAnswers(["Paris", "Belgrade"]);

    expect(decodeMissingWordAnswers(encoded, 2)).toEqual(["Paris", "Belgrade"]);
  });

  it("decodes an empty/invalid raw value to all-blank", () => {
    expect(decodeMissingWordAnswers("", 2)).toEqual(["", ""]);
    expect(decodeMissingWordAnswers("not json", 2)).toEqual(["", ""]);
  });

  it("rejects a decoded array of the wrong length", () => {
    expect(decodeMissingWordAnswers(encodeMissingWordAnswers(["Paris"]), 2)).toEqual(["", ""]);
  });
});

describe("missingWordExerciseRuntime.grade", () => {
  it("accepts exact matches for every blank", () => {
    const raw = encodeMissingWordAnswers(["Paris", "Belgrade"]);

    expect(missingWordExerciseRuntime.grade(buildExercise(), instance, raw)).toEqual({
      isCorrect: true,
    });
  });

  it("is case-insensitive for a variable with matchCase off", () => {
    const raw = encodeMissingWordAnswers(["Paris", "belgrade"]);

    expect(missingWordExerciseRuntime.grade(buildExercise(), instance, raw)).toEqual({
      isCorrect: true,
    });
  });

  it("rejects a case mismatch for a variable with matchCase on", () => {
    const raw = encodeMissingWordAnswers(["paris", "Belgrade"]);

    expect(missingWordExerciseRuntime.grade(buildExercise(), instance, raw)).toEqual({
      isAnswered: true,
      isCorrect: false,
      share: 0.5,
    });
  });

  it("rejects when only one of several blanks is correct", () => {
    const raw = encodeMissingWordAnswers(["Paris", "London"]);

    expect(missingWordExerciseRuntime.grade(buildExercise(), instance, raw)).toEqual({
      isAnswered: true,
      isCorrect: false,
      share: 0.5,
    });
  });

  it("reports no answer when every blank is empty", () => {
    const raw = encodeMissingWordAnswers(["", "  "]);

    expect(missingWordExerciseRuntime.grade(buildExercise(), instance, raw)).toEqual({
      isAnswered: false,
      isCorrect: false,
      noAnswerMessageKey: "courseDetails.enterAnswer",
    });
  });

  it("accepts any one of multiple accepted answers", () => {
    const exercise = buildExercise();
    exercise.variables[0] = { answers: ["Paris", "City of Light"], matchCase: true, name: "c1" };
    const raw = encodeMissingWordAnswers(["City of Light", "Belgrade"]);

    expect(missingWordExerciseRuntime.grade(exercise, instance, raw)).toEqual({
      isCorrect: true,
    });
  });
});

// SLJ-140: the summary after a graded test.
describe("missingWordExerciseRuntime.review", () => {
  it("gives each blank's answer, the correct one, and up to four words before it", () => {
    expect(
      missingWordExerciseRuntime.review!(buildExercise(), instance, encodeMissingWordAnswers(["Paris", "Zagreb"])),
    ).toEqual([
      { answer: "Paris", isCorrect: true, label: "capital of France is", solution: "Paris" },
      { answer: "Zagreb", isCorrect: false, label: "Capital of Serbia is", solution: "Belgrade" },
    ]);
    // The text between two blanks starts with the first one's punctuation.
    const days = { ...buildExercise(), segments: [
      { kind: "text" as const, value: "Monday, " },
      { kind: "blank" as const, variableName: "c1" },
      { kind: "text" as const, value: ", Wednesday, " },
      { kind: "blank" as const, variableName: "c2" },
    ] };
    expect(missingWordExerciseRuntime.review!(days, instance, encodeMissingWordAnswers(["Paris", "Belgrade"])).map((part) => part.label)).toEqual([
      "Monday,",
      "Wednesday,",
    ]);
  });
});
