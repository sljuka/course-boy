import { describe, expect, it } from "vitest";

import { rewriteExerciseRuntime } from "@/lib/exercise-kinds/rewrite";

const shared = {
  kind: "rewrite" as const,
  locales: {
    sr: {
      prompt: "Napiši u upravnom govoru",
      solutions: ["Nena reče: „Kupiću hleb.“", "„Kupiću hleb“, reče Nena."],
      source: "Nena je rekla da će kupiti hleb.",
    },
  },
  tags: [],
};
const resolve = (definition: typeof shared & { acceptWithoutDiacritics?: boolean }) =>
  rewriteExerciseRuntime.resolveForPlayer(definition, {
    courseId: "c",
    id: "e1",
    prompt: "Napiši u upravnom govoru",
    requestedLocales: ["sr"],
  });
const instance = { kind: "rewrite" as const };

// SLJ-146: a written answer is right when it matches any solution.
describe("rewrite exercise", () => {
  it("resolves the language's sentence and solutions, strict settings off", () => {
    expect(resolve(shared)).toMatchObject({
      acceptWithoutDiacritics: false,
      matchCase: false,
      matchQuotes: false,
      solutions: shared.locales.sr.solutions,
      source: "Nena je rekla da će kupiti hleb.",
    });
  });

  it("grades right by any solution, wrong otherwise, and nothing written isn't an answer", () => {
    const exercise = resolve(shared);
    expect(rewriteExerciseRuntime.grade(exercise, instance, 'nena reče: "kupiću hleb."')).toEqual({ isCorrect: true });
    expect(rewriteExerciseRuntime.grade(exercise, instance, "„Kupiću hleb“, reče Nena.")).toEqual({ isCorrect: true });
    expect(rewriteExerciseRuntime.grade(exercise, instance, "Kupiću hleb reče Nena")).toEqual({
      isAnswered: true,
      isCorrect: false,
    });
    expect(rewriteExerciseRuntime.grade(exercise, instance, "  ")).toMatchObject({ isAnswered: false });
    expect(
      rewriteExerciseRuntime.grade(resolve({ ...shared, acceptWithoutDiacritics: true }), instance, "Nena rece: „Kupicu hleb.“"),
    ).toEqual({ isCorrect: true });
  });

  it("reviews against the nearest solution", () => {
    expect(rewriteExerciseRuntime.review!(resolve(shared), instance, "Kupiću hleb reče Nena")).toEqual([
      { answer: "Kupiću hleb reče Nena", isCorrect: false, solution: "„Kupiću hleb“, reče Nena." },
    ]);
  });

  it("is valid with a solution for a written prompt", () => {
    expect(rewriteExerciseRuntime.isValid(shared)).toBe(true);
    expect(rewriteExerciseRuntime.isValid({ ...shared, locales: { sr: { prompt: "x", solutions: [] } } })).toBe(false);
    expect(rewriteExerciseRuntime.isValid({ ...shared, matchCase: "yes" })).toBe(false);
  });
});
