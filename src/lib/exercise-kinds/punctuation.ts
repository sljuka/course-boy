import type { PunctuationCourseExercise, SharedPunctuationTestExerciseDefinition } from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isLocale } from "../i18n";
import {
  comparePunctuation,
  decodePunctuationAnswer,
  joinPunctuationSentence,
  normalizeMarks,
  parsePunctuationText,
} from "../punctuation";

import {
  hasValidTags,
  type ExerciseKindRuntime,
  type GradeResult,
  type ResolveForPlayerContext,
  partShare,
  type ReviewPart,
} from "./types";

// A sentence's marks placed by the student (SLJ-145). Valid when every
// language's text is a string, and a written one has a mark to place.
function isValid(exercise: Record<string, unknown>): exercise is SharedPunctuationTestExerciseDefinition {
  if (!hasValidTags(exercise)) return false;
  if (
    typeof exercise.marks !== "undefined" &&
    (!Array.isArray(exercise.marks) || !exercise.marks.every((mark) => typeof mark === "string"))
  ) {
    return false;
  }
  const marks = normalizeMarks(exercise.marks as string[] | undefined);
  if (!exercise.locales || typeof exercise.locales !== "object") return false;
  const entries = Object.entries(exercise.locales);
  if (entries.length === 0) return false;

  return entries.every(([locale, metadata]) => {
    if (!isLocale(locale) || !metadata || typeof metadata !== "object") return false;
    const typed = metadata as { hint?: unknown; prompt?: unknown; text?: unknown };
    if (
      typeof typed.prompt !== "string" ||
      (typeof typed.hint !== "undefined" && typeof typed.hint !== "string") ||
      typeof typed.text !== "string"
    ) {
      return false;
    }
    return typed.text.trim().length === 0 || parsePunctuationText(typed.text, marks).gaps.some(Boolean);
  });
}

function resolveForPlayer(
  shared: SharedPunctuationTestExerciseDefinition,
  context: ResolveForPlayerContext,
): PunctuationCourseExercise {
  const text =
    context.requestedLocales.map((locale) => shared.locales[locale]?.text).find((candidate) => typeof candidate === "string") ??
    "";
  const marks = normalizeMarks(shared.marks);
  const { gaps, words } = parsePunctuationText(text, marks);

  return {
    gaps,
    hint: context.hint,
    id: context.id,
    kind: "punctuation",
    marks,
    prompt: context.prompt,
    tags: shared.tags,
    words,
  };
}

function buildInstance(): ExerciseInstance {
  return { kind: "punctuation" };
}

// Gap by gap: right when every gap has exactly its marks. Partial credit is
// the gaps right, less each gap given marks it shouldn't have.
function grade(exercise: PunctuationCourseExercise, _instance: ExerciseInstance, rawAnswer: string): GradeResult {
  const given = decodePunctuationAnswer(rawAnswer, exercise.gaps.length);
  if (given.every((marks) => !marks)) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.placePunctuation" };
  }
  const { extra, parts, right, total } = comparePunctuation(exercise.gaps, given);
  if (parts.every(Boolean)) return { isCorrect: true };
  return { isAnswered: true, isCorrect: false, parts, share: partShare(right, extra, total) };
}

// The student's sentence and the correct one (SLJ-140).
function review(exercise: PunctuationCourseExercise, _instance: ExerciseInstance, rawAnswer: string): ReviewPart[] {
  const given = decodePunctuationAnswer(rawAnswer, exercise.gaps.length);
  return [
    {
      answer: given.some(Boolean) ? joinPunctuationSentence(exercise.words, given) : "",
      isCorrect: comparePunctuation(exercise.gaps, given).parts.every(Boolean),
      solution: joinPunctuationSentence(exercise.words, exercise.gaps),
    },
  ];
}

export const punctuationExerciseRuntime: ExerciseKindRuntime<
  SharedPunctuationTestExerciseDefinition,
  PunctuationCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "punctuation",
  resolveForPlayer,
  review,
};
