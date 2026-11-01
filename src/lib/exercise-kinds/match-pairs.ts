import { matkoAssetUrl } from "../course-assets";
import { resolveAssetFilename } from "../course-asset-id";
import type { MatchPairsCourseExercise, SharedMatchPairsTestExerciseDefinition } from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isValidExerciseSpeech } from "../exercise-speech";
import { isLocale } from "../i18n";

import { hasValidTags, partShare, type ExerciseKindRuntime, type GradeResult, type ResolveForPlayerContext, type ReviewPart } from "./types";

// Match the pairs (SLJ-176): `left[i]` goes with `right[i]`. Both columns are
// shuffled for the student, who taps an item on the left and then its partner
// on the right. Each pair is a part: partial credit counts the right ones.

export const MIN_PAIRS = 2;
export const MAX_PAIRS = 8;

const isImageList = (images: unknown, count: number) =>
  images === undefined ||
  (Array.isArray(images) &&
    images.length === count &&
    images.every((image) => image === null || (typeof image === "string" && resolveAssetFilename(image) !== null)));

function isValid(exercise: Record<string, unknown>): exercise is SharedMatchPairsTestExerciseDefinition {
  if (!hasValidTags(exercise)) return false;
  if (exercise.listenLeft !== undefined && typeof exercise.listenLeft !== "boolean") return false;
  // Heard items need the language they're read in.
  if (exercise.listenLeft === true && !isValidExerciseSpeech(exercise.speech)) return false;
  if (!exercise.locales || typeof exercise.locales !== "object") return false;

  const localeEntries = Object.entries(exercise.locales as Record<string, unknown>);
  if (localeEntries.length === 0) return false;
  let pairCount: number | undefined;
  const localesAreValid = localeEntries.every(([locale, content]) => {
    if (!isLocale(locale) || !content || typeof content !== "object") return false;
    const { hint, left, prompt, right } = content as { hint?: unknown; left?: unknown; prompt?: unknown; right?: unknown };
    if (typeof prompt !== "string" || (hint !== undefined && typeof hint !== "string")) return false;
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    if (left.length < MIN_PAIRS || left.length > MAX_PAIRS) return false;
    if (![...left, ...right].every((item) => typeof item === "string")) return false;
    pairCount ??= left.length;
    return left.length === pairCount;
  });
  if (!localesAreValid || pairCount === undefined) return false;

  return isImageList(exercise.leftImages, pairCount) && isImageList(exercise.rightImages, pairCount);
}

function resolveForPlayer(shared: SharedMatchPairsTestExerciseDefinition, context: ResolveForPlayerContext): MatchPairsCourseExercise {
  const content = context.requestedLocales.map((locale) => shared.locales[locale]).find((value) => value !== undefined);
  const left = content?.left ?? [];
  const right = content?.right ?? [];
  const imageUrls = (images: (string | null)[] | undefined) =>
    left.map((_item, index) => {
      const image = images?.[index];
      return image ? matkoAssetUrl(context.courseId, image) : null;
    });

  return {
    hint: context.hint,
    id: context.id,
    kind: "match-pairs",
    left,
    leftImageUrls: imageUrls(shared.leftImages),
    listenLeft: shared.listenLeft ?? false,
    prompt: context.prompt,
    right,
    rightImageUrls: imageUrls(shared.rightImages),
    tags: shared.tags,
  };
}

function shuffleIndexes(length: number): number[] {
  const order = Array.from({ length }, (_unused, index) => index);
  for (let currentIndex = order.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    [order[currentIndex], order[randomIndex]] = [order[randomIndex], order[currentIndex]];
  }
  return order;
}

// The right column never lines up with the left one, or every pair would sit
// side by side: reshuffled until at least one item moved (always possible
// with two or more pairs).
function buildInstance(exercise: MatchPairsCourseExercise): ExerciseInstance {
  const count = exercise.left.length;
  const leftOrder = shuffleIndexes(count);
  let rightOrder = shuffleIndexes(count);
  while (count > 1 && rightOrder.every((rightIndex, row) => rightIndex === leftOrder[row])) {
    rightOrder = shuffleIndexes(count);
  }
  return { kind: "match-pairs", leftOrder, rightOrder };
}

// The answer: for each left item (by its index in the file), the right item
// it's paired with, or null while it has no partner.
export function encodeMatchPairsAnswer(pairs: (number | null)[]): string {
  return JSON.stringify(pairs);
}

export function decodeMatchPairsAnswer(raw: string, count: number): (number | null)[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length === count &&
      parsed.every((value) => value === null || (Number.isInteger(value) && value >= 0 && value < count))
    ) {
      return parsed as (number | null)[];
    }
  } catch {
    // fall through to the empty default below
  }
  return Array.from({ length: count }, () => null);
}

function grade(exercise: MatchPairsCourseExercise, _instance: ExerciseInstance, rawAnswer: string): GradeResult {
  const pairs = decodeMatchPairsAnswer(rawAnswer, exercise.left.length);
  if (pairs.every((pair) => pair === null)) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "matchPairs.noAnswer" };
  }
  const parts = pairs.map((rightIndex, leftIndex) => rightIndex === leftIndex);
  if (parts.every(Boolean)) return { isCorrect: true };
  const right = parts.filter(Boolean).length;
  return {
    incomplete: pairs.some((pair) => pair === null),
    isAnswered: true,
    isCorrect: false,
    parts,
    share: partShare(right, 0, pairs.length),
  };
}

// Each left item, what it was paired with and its partner. A heard item is
// shown by its text here: the test is over.
function review(exercise: MatchPairsCourseExercise, _instance: ExerciseInstance, rawAnswer: string): ReviewPart[] {
  const pairs = decodeMatchPairsAnswer(rawAnswer, exercise.left.length);
  return exercise.left.map((label, leftIndex) => {
    const rightIndex = pairs[leftIndex];
    return {
      answer: rightIndex === null || rightIndex === undefined ? "" : (exercise.right[rightIndex] ?? ""),
      isCorrect: rightIndex === leftIndex,
      label,
      solution: exercise.right[leftIndex] ?? "",
    };
  });
}

export const matchPairsExerciseRuntime: ExerciseKindRuntime<SharedMatchPairsTestExerciseDefinition, MatchPairsCourseExercise> = {
  buildInstance,
  grade,
  isValid,
  kind: "match-pairs",
  resolveForPlayer,
  review,
};
