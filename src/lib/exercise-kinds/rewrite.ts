import type { RewriteCourseExercise, SharedRewriteTestExerciseDefinition } from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isLocale } from "../i18n";
import { closestRewriteSolution, matchesRewrite } from "../rewrite";

import {
  hasValidTags,
  type ExerciseKindRuntime,
  type GradeResult,
  type ResolveForPlayerContext,
  type ReviewPart,
} from "./types";

const isOptionalBoolean = (value: unknown) => typeof value === "undefined" || typeof value === "boolean";

// A written answer matched against the teacher's solutions (SLJ-146). Valid
// when each language has a prompt and, once written, at least one solution.
function isValid(exercise: Record<string, unknown>): exercise is SharedRewriteTestExerciseDefinition {
  if (!hasValidTags(exercise)) return false;
  if (![exercise.acceptWithoutDiacritics, exercise.matchCase, exercise.matchQuotes].every(isOptionalBoolean)) {
    return false;
  }
  if (!exercise.locales || typeof exercise.locales !== "object") return false;
  const entries = Object.entries(exercise.locales);
  if (entries.length === 0) return false;

  return entries.every(([locale, metadata]) => {
    if (!isLocale(locale) || !metadata || typeof metadata !== "object") return false;
    const typed = metadata as { hint?: unknown; prompt?: unknown; solutions?: unknown; source?: unknown };
    return (
      typeof typed.prompt === "string" &&
      (typeof typed.hint === "undefined" || typeof typed.hint === "string") &&
      (typeof typed.source === "undefined" || typeof typed.source === "string") &&
      Array.isArray(typed.solutions) &&
      typed.solutions.every((solution) => typeof solution === "string" && solution.trim().length > 0) &&
      (typed.prompt.trim().length === 0 || typed.solutions.length > 0)
    );
  });
}

function resolveForPlayer(
  shared: SharedRewriteTestExerciseDefinition,
  context: ResolveForPlayerContext,
): RewriteCourseExercise {
  const locale = context.requestedLocales.find((candidate) => (shared.locales[candidate]?.solutions.length ?? 0) > 0);
  const content = locale ? shared.locales[locale] : undefined;

  return {
    acceptWithoutDiacritics: shared.acceptWithoutDiacritics === true,
    hint: context.hint,
    id: context.id,
    kind: "rewrite",
    matchCase: shared.matchCase === true,
    matchQuotes: shared.matchQuotes === true,
    prompt: context.prompt,
    solutions: content?.solutions ?? [],
    source: content?.source ?? "",
    tags: shared.tags,
  };
}

function buildInstance(): ExerciseInstance {
  return { kind: "rewrite" };
}

// Right or wrong, no partial credit: a rewrite is one answer.
function grade(exercise: RewriteCourseExercise, _instance: ExerciseInstance, rawAnswer: string): GradeResult {
  if (rawAnswer.trim().length === 0) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.writeAnswer" };
  }
  return matchesRewrite(rawAnswer, exercise.solutions, exercise)
    ? { isCorrect: true }
    : { isAnswered: true, isCorrect: false };
}

// What the student wrote, and the solution nearest to it (SLJ-140).
function review(exercise: RewriteCourseExercise, _instance: ExerciseInstance, rawAnswer: string): ReviewPart[] {
  return [
    {
      answer: rawAnswer.trim(),
      isCorrect: matchesRewrite(rawAnswer, exercise.solutions, exercise),
      solution: closestRewriteSolution(rawAnswer, exercise.solutions, exercise),
    },
  ];
}

export const rewriteExerciseRuntime: ExerciseKindRuntime<SharedRewriteTestExerciseDefinition, RewriteCourseExercise> = {
  buildInstance,
  grade,
  isValid,
  kind: "rewrite",
  resolveForPlayer,
  review,
};
