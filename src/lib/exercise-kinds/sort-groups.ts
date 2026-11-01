import { matkoAssetUrl } from "../course-assets";
import { resolveAssetFilename } from "../course-asset-id";
import type { SharedSortGroupsTestExerciseDefinition, SortGroupsCourseExercise } from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isValidExerciseSpeech } from "../exercise-speech";
import { isLocale } from "../i18n";

import { shuffleIndexes } from "./shuffle";
import { hasValidTags, partShare, type ExerciseKindRuntime, type GradeResult, type ResolveForPlayerContext, type ReviewPart } from "./types";

// Sort into groups (SLJ-178): the student puts every card from a shuffled
// pile into one of 2–4 groups. Each card in its group is a part for partial
// credit; with `noRightAnswer` any sorting of every card is right.

export const MIN_GROUPS = 2;
export const MAX_GROUPS = 4;
export const MIN_CARDS = 2;
export const MAX_CARDS = 16;

function isValid(exercise: Record<string, unknown>): exercise is SharedSortGroupsTestExerciseDefinition {
  if (!hasValidTags(exercise)) return false;
  for (const flag of [exercise.listen, exercise.noRightAnswer]) {
    if (flag !== undefined && typeof flag !== "boolean") return false;
  }
  // Heard cards need the language they're read in.
  if (exercise.listen === true && !isValidExerciseSpeech(exercise.speech)) return false;
  if (!exercise.locales || typeof exercise.locales !== "object") return false;

  const localeEntries = Object.entries(exercise.locales as Record<string, unknown>);
  if (localeEntries.length === 0) return false;
  let groupCount: number | undefined;
  let cardCount: number | undefined;
  const localesAreValid = localeEntries.every(([locale, content]) => {
    if (!isLocale(locale) || !content || typeof content !== "object") return false;
    const { cards, groups, hint, prompt } = content as { cards?: unknown; groups?: unknown; hint?: unknown; prompt?: unknown };
    if (typeof prompt !== "string" || (hint !== undefined && typeof hint !== "string")) return false;
    if (!Array.isArray(groups) || groups.length < MIN_GROUPS || groups.length > MAX_GROUPS) return false;
    if (!Array.isArray(cards) || cards.length < MIN_CARDS || cards.length > MAX_CARDS) return false;
    if (![...groups, ...cards].every((text) => typeof text === "string")) return false;
    groupCount ??= groups.length;
    cardCount ??= cards.length;
    return groups.length === groupCount && cards.length === cardCount;
  });
  if (!localesAreValid || groupCount === undefined || cardCount === undefined) return false;

  const groups = groupCount;
  const { cardGroups, cardImages } = exercise;
  if (
    !Array.isArray(cardGroups) ||
    cardGroups.length !== cardCount ||
    !cardGroups.every((group) => Number.isInteger(group) && group >= 0 && group < groups)
  ) {
    return false;
  }
  return (
    cardImages === undefined ||
    (Array.isArray(cardImages) &&
      cardImages.length === cardCount &&
      cardImages.every((image) => image === null || (typeof image === "string" && resolveAssetFilename(image) !== null)))
  );
}

function resolveForPlayer(shared: SharedSortGroupsTestExerciseDefinition, context: ResolveForPlayerContext): SortGroupsCourseExercise {
  const content = context.requestedLocales.map((locale) => shared.locales[locale]).find((value) => value !== undefined);
  const cards = content?.cards ?? [];
  return {
    cardGroups: shared.cardGroups,
    cardImageUrls: cards.map((_card, index) => {
      const image = shared.cardImages?.[index];
      return image ? matkoAssetUrl(context.courseId, image) : null;
    }),
    cards,
    groups: content?.groups ?? [],
    hint: context.hint,
    id: context.id,
    kind: "sort-groups",
    listen: shared.listen ?? false,
    noRightAnswer: shared.noRightAnswer ?? false,
    prompt: context.prompt,
    tags: shared.tags,
  };
}

function buildInstance(exercise: SortGroupsCourseExercise): ExerciseInstance {
  return { cardOrder: shuffleIndexes(exercise.cards.length), kind: "sort-groups" };
}

// The answer: for each card (by its index in the file), the group it's in,
// or null while it's in the pile.
export function encodeSortGroupsAnswer(placed: (number | null)[]): string {
  return JSON.stringify(placed);
}

export function decodeSortGroupsAnswer(raw: string, cardCount: number, groupCount: number): (number | null)[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length === cardCount &&
      parsed.every((value) => value === null || (Number.isInteger(value) && value >= 0 && value < groupCount))
    ) {
      return parsed as (number | null)[];
    }
  } catch {
    // fall through to the empty default below
  }
  return Array.from({ length: cardCount }, () => null);
}

function grade(exercise: SortGroupsCourseExercise, _instance: ExerciseInstance, rawAnswer: string): GradeResult {
  const placed = decodeSortGroupsAnswer(rawAnswer, exercise.cards.length, exercise.groups.length);
  if (placed.every((group) => group === null)) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "sortGroups.noAnswer" };
  }
  const incomplete = placed.some((group) => group === null);
  if (exercise.noRightAnswer) {
    return incomplete ? { incomplete: true, isAnswered: true, isCorrect: false } : { isCorrect: true };
  }
  const parts = placed.map((group, card) => group === exercise.cardGroups[card]);
  if (parts.every(Boolean)) return { isCorrect: true };
  return { incomplete, isAnswered: true, isCorrect: false, parts, share: partShare(parts.filter(Boolean).length, 0, parts.length) };
}

// Card by card: the group it was put in and the one it belongs in.
function review(exercise: SortGroupsCourseExercise, _instance: ExerciseInstance, rawAnswer: string): ReviewPart[] {
  const placed = decodeSortGroupsAnswer(rawAnswer, exercise.cards.length, exercise.groups.length);
  return exercise.cards.map((card, index) => {
    const group = placed[index];
    const given = group === null || group === undefined ? "" : (exercise.groups[group] ?? "");
    return {
      answer: given,
      isCorrect: exercise.noRightAnswer ? group !== null : group === exercise.cardGroups[index],
      label: card,
      solution: exercise.noRightAnswer ? given : (exercise.groups[exercise.cardGroups[index] ?? 0] ?? ""),
    };
  });
}

export const sortGroupsExerciseRuntime: ExerciseKindRuntime<SharedSortGroupsTestExerciseDefinition, SortGroupsCourseExercise> = {
  buildInstance,
  grade,
  isValid,
  kind: "sort-groups",
  resolveForPlayer,
  review,
};
