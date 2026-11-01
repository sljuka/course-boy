import { matkoAssetUrl } from "../course-assets";
import { resolveAssetFilename } from "../course-asset-id";
import type { PutInOrderCourseExercise, SharedPutInOrderTestExerciseDefinition } from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isValidExerciseSpeech } from "../exercise-speech";
import { isLocale } from "../i18n";

import { shuffleIndexesUnlike } from "./shuffle";
import { hasValidTags, partShare, type ExerciseKindRuntime, type GradeResult, type ResolveForPlayerContext, type ReviewPart } from "./types";

// Put in order (SLJ-177): the items in the file are in the right order. The
// student sees them shuffled and taps them in turn; the n-th tapped gets the
// number n. Each item in its right place is a part for partial credit.

export const MIN_ORDER_ITEMS = 2;
export const MAX_ORDER_ITEMS = 10;

function isValid(exercise: Record<string, unknown>): exercise is SharedPutInOrderTestExerciseDefinition {
  if (!hasValidTags(exercise)) return false;
  if (exercise.listen !== undefined && typeof exercise.listen !== "boolean") return false;
  // Heard items need the language they're read in.
  if (exercise.listen === true && !isValidExerciseSpeech(exercise.speech)) return false;
  if (!exercise.locales || typeof exercise.locales !== "object") return false;

  const localeEntries = Object.entries(exercise.locales as Record<string, unknown>);
  if (localeEntries.length === 0) return false;
  let itemCount: number | undefined;
  const localesAreValid = localeEntries.every(([locale, content]) => {
    if (!isLocale(locale) || !content || typeof content !== "object") return false;
    const { hint, items, prompt } = content as { hint?: unknown; items?: unknown; prompt?: unknown };
    if (typeof prompt !== "string" || (hint !== undefined && typeof hint !== "string")) return false;
    if (!Array.isArray(items) || items.length < MIN_ORDER_ITEMS || items.length > MAX_ORDER_ITEMS) return false;
    if (!items.every((item) => typeof item === "string")) return false;
    itemCount ??= items.length;
    return items.length === itemCount;
  });
  if (!localesAreValid || itemCount === undefined) return false;

  const images = exercise.images;
  return (
    images === undefined ||
    (Array.isArray(images) &&
      images.length === itemCount &&
      images.every((image) => image === null || (typeof image === "string" && resolveAssetFilename(image) !== null)))
  );
}

function resolveForPlayer(shared: SharedPutInOrderTestExerciseDefinition, context: ResolveForPlayerContext): PutInOrderCourseExercise {
  const items = context.requestedLocales.map((locale) => shared.locales[locale]?.items).find((value) => Array.isArray(value)) ?? [];
  return {
    hint: context.hint,
    id: context.id,
    imageUrls: items.map((_item, index) => {
      const image = shared.images?.[index];
      return image ? matkoAssetUrl(context.courseId, image) : null;
    }),
    items,
    kind: "put-in-order",
    listen: shared.listen ?? false,
    prompt: context.prompt,
    tags: shared.tags,
  };
}

// Never shown already in order.
function buildInstance(exercise: PutInOrderCourseExercise): ExerciseInstance {
  return { kind: "put-in-order", order: shuffleIndexesUnlike(exercise.items.length) };
}

// The answer: the items' indexes (in the file) in the order tapped; an item
// not tapped yet isn't in it.
export function encodePutInOrderAnswer(sequence: number[]): string {
  return JSON.stringify(sequence);
}

export function decodePutInOrderAnswer(raw: string, count: number): number[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length <= count &&
      parsed.every((value) => Number.isInteger(value) && value >= 0 && value < count) &&
      new Set(parsed).size === parsed.length
    ) {
      return parsed as number[];
    }
  } catch {
    // fall through to the empty default below
  }
  return [];
}

function grade(exercise: PutInOrderCourseExercise, _instance: ExerciseInstance, rawAnswer: string): GradeResult {
  const count = exercise.items.length;
  const sequence = decodePutInOrderAnswer(rawAnswer, count);
  if (sequence.length === 0) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "putInOrder.noAnswer" };
  }
  // By item: is it where it belongs?
  const parts = exercise.items.map((_item, itemIndex) => sequence[itemIndex] === itemIndex);
  if (sequence.length === count && parts.every(Boolean)) return { isCorrect: true };
  return {
    incomplete: sequence.length < count,
    isAnswered: true,
    isCorrect: false,
    parts,
    share: partShare(parts.filter(Boolean).length, 0, count),
  };
}

// Place by place: what the student put there and what belongs there.
function review(exercise: PutInOrderCourseExercise, _instance: ExerciseInstance, rawAnswer: string): ReviewPart[] {
  const sequence = decodePutInOrderAnswer(rawAnswer, exercise.items.length);
  return exercise.items.map((solution, place) => {
    const given = sequence[place];
    return {
      answer: given === undefined ? "" : (exercise.items[given] ?? ""),
      isCorrect: given === place,
      label: `${place + 1}`,
      solution,
    };
  });
}

export const putInOrderExerciseRuntime: ExerciseKindRuntime<SharedPutInOrderTestExerciseDefinition, PutInOrderCourseExercise> = {
  buildInstance,
  grade,
  isValid,
  kind: "put-in-order",
  resolveForPlayer,
  review,
};
