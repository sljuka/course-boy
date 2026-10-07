import { describe, expect, it } from "vitest";

import type { SharedNumericTestExerciseDefinition } from "@/lib/course-package";
import {
  getExerciseKindRuntime,
  isExerciseKind,
  normalizeExerciseKind,
  resolveSharedExerciseForPlayer,
} from "@/lib/exercise-kinds/registry";

describe("isExerciseKind", () => {
  it("accepts every registered kind", () => {
    expect(isExerciseKind("numeric")).toBe(true);
    expect(isExerciseKind("multiple-choice")).toBe(true);
    expect(isExerciseKind("word-types")).toBe(true);
  });

  it("rejects an unregistered or non-string value", () => {
    expect(isExerciseKind("essay")).toBe(false);
    expect(isExerciseKind(undefined)).toBe(false);
    expect(isExerciseKind(42)).toBe(false);
  });
});

describe("normalizeExerciseKind", () => {
  it("defaults a missing kind (pre-multiple-choice on-disk files) to numeric", () => {
    expect(normalizeExerciseKind(undefined)).toBe("numeric");
  });

  it("passes a recognized kind through unchanged", () => {
    expect(normalizeExerciseKind("word-types")).toBe("word-types");
  });

  it("returns null for a genuinely unrecognized kind, rather than silently defaulting to numeric", () => {
    expect(normalizeExerciseKind("essay")).toBeNull();
  });
});

describe("getExerciseKindRuntime", () => {
  it("returns a runtime whose kind matches the lookup key for every registered kind", () => {
    for (const kind of ["numeric", "multiple-choice", "word-types"] as const) {
      expect(getExerciseKindRuntime(kind).kind).toBe(kind);
    }
  });
});

describe("resolveSharedExerciseForPlayer", () => {
  it("falls back to the next language when the prompt is empty in the reader's", () => {
    const exercise: SharedNumericTestExerciseDefinition = {
      kind: "numeric",
      locales: {
        en: { answerPlaceholder: "", hint: "", prompt: "{{x}} + {{y}}?" },
        sr: { answerPlaceholder: "", hint: "", prompt: "" },
      },
      solution: { formula: "x + y", precision: 0 },
      tags: [],
      variables: { x: { max: 5, min: 1, type: "integer" }, y: { max: 5, min: 1, type: "integer" } },
    };

    const resolved = resolveSharedExerciseForPlayer(exercise, "t#1", ["sr", "en"], "course");
    expect(resolved.prompt).toBe("{{x}} + {{y}}?");
  });
});
