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
    });
  });

  it("rejects when only one of several blanks is correct", () => {
    const raw = encodeMissingWordAnswers(["Paris", "London"]);

    expect(missingWordExerciseRuntime.grade(buildExercise(), instance, raw)).toEqual({
      isAnswered: true,
      isCorrect: false,
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
