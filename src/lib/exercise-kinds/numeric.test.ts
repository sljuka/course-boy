import { describe, expect, it } from "vitest";

import type { SharedNumericTestExerciseDefinition } from "@/lib/course-package";
import {
  decodeNumericAnswers,
  encodeNumericAnswers,
  numericExerciseRuntime,
  rollVariableValue,
  solveInOrder,
} from "@/lib/exercise-kinds/numeric";

describe("rollVariableValue", () => {
  it("stays within range with no parity constraint", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const value = rollVariableValue({ max: 10, min: 5, type: "integer" });

      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(10);
    }
  });

  it("only produces even values when parity is even", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const value = rollVariableValue({ max: 20, min: 1, parity: "even", type: "integer" });

      expect(value % 2).toBe(0);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(20);
    }
  });

  it("only produces odd values when parity is odd", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const value = rollVariableValue({ max: 20, min: 1, parity: "odd", type: "integer" });

      expect(Math.abs(value % 2)).toBe(1);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(20);
    }
  });

  it("falls back to a deterministic valid value for a single-value range", () => {
    expect(rollVariableValue({ max: 4, min: 4, parity: "even", type: "integer" })).toBe(4);
  });
});

// SLJ-139: Alice has {{x}} apples, Bob {{y}} times more, Carol {{z}} less than Bob.
describe("several solutions", () => {
  const shared: SharedNumericTestExerciseDefinition = {
    kind: "numeric",
    locales: {
      en: { prompt: "Alice has {{x}}, Bob {{y}} times more, Carol {{z}} less than Bob", solutionLabels: ["Bob", "Carol"] },
      sr: { prompt: "Alisa ima {{x}}…", solutionLabels: ["Bob", "Karol"] },
    },
    moreSolutions: [{ formula: "x * y - z", precision: 0 }],
    solution: { formula: "x * y", precision: 0 },
    tags: [],
    variables: {
      x: { max: 4, min: 4, type: "integer" },
      y: { max: 3, min: 3, type: "integer" },
      z: { max: 2, min: 2, type: "integer" },
    },
  };
  const exercise = numericExerciseRuntime.resolveForPlayer(shared, {
    courseId: "c",
    id: "t#1",
    prompt: shared.locales.sr!.prompt,
    requestedLocales: ["sr", "en"],
  });
  const instance = numericExerciseRuntime.buildInstance(exercise);
  const grade = (answers: string[]) => numericExerciseRuntime.grade(exercise, instance, encodeNumericAnswers(answers));

  it("is valid with its extra solutions and labels, and resolves the reader's labels", () => {
    expect(numericExerciseRuntime.isValid(shared as never)).toBe(true);
    expect(exercise.solutionLabels).toEqual(["Bob", "Karol"]);
    expect(instance).toMatchObject({ expectedAnswer: 12, expectedAnswers: [12, 10] });
  });

  it("grades each box: all right, some right (with its share), empty", () => {
    expect(grade(["12", "10"])).toEqual({ isCorrect: true });
    expect(grade(["12", "9"])).toEqual({ isAnswered: true, isCorrect: false, parts: [true, false], share: 0.5 });
    expect(grade(["12", ""])).toEqual({
      incomplete: true,
      isAnswered: true,
      isCorrect: false,
      parts: [true, false],
      share: 0.5,
    });
    expect(grade(["", ""])).toMatchObject({ isAnswered: false, isCorrect: false });
  });

  it("reviews each solution with its label, for the summary (SLJ-140)", () => {
    expect(numericExerciseRuntime.review!(exercise, instance, encodeNumericAnswers(["12", "9"]))).toEqual([
      { answer: "12", isCorrect: true, label: "Bob", solution: "12" },
      { answer: "9", isCorrect: false, label: "Karol", solution: "10" },
    ]);
  });

  it("keeps a single answer as plain text, and several as a list", () => {
    expect(encodeNumericAnswers(["7"])).toBe("7");
    expect(decodeNumericAnswers("7", 1)).toEqual(["7"]);
    expect(decodeNumericAnswers(encodeNumericAnswers(["1", "2"]), 2)).toEqual(["1", "2"]);
    expect(decodeNumericAnswers("", 2)).toEqual(["", ""]);
  });
});

describe("solveInOrder", () => {
  it("lets a later formula use an earlier solution's rounded result", () => {
    expect(
      solveInOrder(
        [
          { formula: "x * y", precision: 0 },
          { formula: "solution1 - z", precision: 0 },
          { formula: "solution1 + solution2", precision: 0 },
        ],
        { x: 4, y: 3, z: 2 },
      ),
    ).toEqual([12, 10, 22]);
    expect(solveInOrder([{ formula: "x / 3", precision: 1 }, { formula: "solution1 * 3", precision: 1 }], { x: 10 })).toEqual([
      3.3, 9.9,
    ]);
  });
});
