import type { SolutionValidationResult, SortGroupsTestExercise } from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";
import type { SharedSortGroupsTestExerciseDefinition } from "@/lib/course-package";
import { MAX_CARDS, MAX_GROUPS, MIN_CARDS, MIN_GROUPS } from "@/lib/exercise-kinds/sort-groups";
import { isValidExerciseSpeech, type SpeechLanguage } from "@/lib/exercise-speech";
import type { Locale } from "@/lib/i18n";

// Sort into groups (SLJ-178) in the editor: group names and card texts per
// language; each card's group and picture shared by every language.

export { MAX_CARDS, MAX_GROUPS, MIN_CARDS, MIN_GROUPS };

type Content = SortGroupsTestExercise["locales"][string];

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

const emptyContent = (groups = 2, cards = 4): Content => ({
  cards: Array.from({ length: cards }, () => ""),
  groups: Array.from({ length: groups }, () => ""),
  hint: "",
  prompt: "",
});

export function createExercise(locales: Locale[]): SortGroupsTestExercise {
  return {
    cardGroups: [0, 0, 1, 1],
    cardImages: [null, null, null, null],
    id: createId("ex"),
    kind: "sort-groups",
    listen: false,
    locales: Object.fromEntries(locales.map((locale) => [locale, emptyContent()])),
    noRightAnswer: false,
    tagIds: [],
  };
}

const groupCount = (exercise: SortGroupsTestExercise) => Object.values(exercise.locales)[0]?.groups.length ?? MIN_GROUPS;
const cardCount = (exercise: SortGroupsTestExercise) => exercise.cardGroups.length;

function withContent(exercise: SortGroupsTestExercise, locale: Locale, change: (content: Content) => Content): SortGroupsTestExercise {
  const content = exercise.locales[locale] ?? emptyContent(groupCount(exercise), cardCount(exercise));
  return { ...exercise, locales: { ...exercise.locales, [locale]: change(content) } };
}

function mapLocales(exercise: SortGroupsTestExercise, change: (content: Content) => Content): SortGroupsTestExercise["locales"] {
  return Object.fromEntries(Object.entries(exercise.locales).map(([locale, content]) => [locale, change(content)]));
}

const replaceAt = <T>(items: T[], index: number, value: T) => items.map((item, itemIndex) => (itemIndex === index ? value : item));
const without = <T>(items: T[], index: number) => items.filter((_item, itemIndex) => itemIndex !== index);

export const updatePrompt = (exercise: SortGroupsTestExercise, locale: Locale, prompt: string) =>
  withContent(exercise, locale, (content) => ({ ...content, prompt }));

export const updateGroupName = (exercise: SortGroupsTestExercise, locale: Locale, index: number, name: string) =>
  withContent(exercise, locale, (content) => ({ ...content, groups: replaceAt(content.groups, index, name) }));

export const updateCardText = (exercise: SortGroupsTestExercise, locale: Locale, index: number, text: string) =>
  withContent(exercise, locale, (content) => ({ ...content, cards: replaceAt(content.cards, index, text) }));

export const updateCardImage = (exercise: SortGroupsTestExercise, index: number, image: string | null): SortGroupsTestExercise => ({
  ...exercise,
  cardImages: replaceAt(exercise.cardImages, index, image),
});

export const updateCardGroup = (exercise: SortGroupsTestExercise, index: number, group: number): SortGroupsTestExercise => ({
  ...exercise,
  cardGroups: replaceAt(exercise.cardGroups, index, group),
});

export function addGroup(exercise: SortGroupsTestExercise): SortGroupsTestExercise {
  if (groupCount(exercise) >= MAX_GROUPS) return exercise;
  return { ...exercise, locales: mapLocales(exercise, (content) => ({ ...content, groups: [...content.groups, ""] })) };
}

// A removed group's cards go to the first group; later groups move up one.
export function removeGroup(exercise: SortGroupsTestExercise, index: number): SortGroupsTestExercise {
  if (groupCount(exercise) <= MIN_GROUPS) return exercise;
  return {
    ...exercise,
    cardGroups: exercise.cardGroups.map((group) => (group === index ? 0 : group > index ? group - 1 : group)),
    locales: mapLocales(exercise, (content) => ({ ...content, groups: without(content.groups, index) })),
  };
}

// A new card goes in the group of the card above it.
export function addCard(exercise: SortGroupsTestExercise): SortGroupsTestExercise {
  if (cardCount(exercise) >= MAX_CARDS) return exercise;
  return {
    ...exercise,
    cardGroups: [...exercise.cardGroups, exercise.cardGroups.at(-1) ?? 0],
    cardImages: [...exercise.cardImages, null],
    locales: mapLocales(exercise, (content) => ({ ...content, cards: [...content.cards, ""] })),
  };
}

export function removeCard(exercise: SortGroupsTestExercise, index: number): SortGroupsTestExercise {
  if (cardCount(exercise) <= MIN_CARDS) return exercise;
  return {
    ...exercise,
    cardGroups: without(exercise.cardGroups, index),
    cardImages: without(exercise.cardImages, index),
    locales: mapLocales(exercise, (content) => ({ ...content, cards: without(content.cards, index) })),
  };
}

// Heard cards need a language to be read in: the course's, else English.
export function setListen(exercise: SortGroupsTestExercise, listen: boolean, locale: Locale): SortGroupsTestExercise {
  const lang: SpeechLanguage = locale === "sr" || locale === "sr-Cyrl" ? "sr" : "en";
  return { ...exercise, listen, ...(listen && !exercise.speech ? { speech: { lang } } : {}) };
}

export function setNoRightAnswer(exercise: SortGroupsTestExercise, noRightAnswer: boolean): SortGroupsTestExercise {
  return { ...exercise, noRightAnswer };
}

export function validate(exercise: SortGroupsTestExercise, locale: Locale): SolutionValidationResult {
  const content = exercise.locales[locale];
  if (!content) return { status: "idle" };
  const hasPicture = exercise.cardImages.some((image) => image !== null);
  if ([...content.groups, ...content.cards].every((text) => !text.trim()) && !hasPicture) return { status: "idle" };

  if (content.groups.some((group) => !group.trim())) return { message: "Name every group", status: "error" };
  if (content.cards.some((card) => !card.trim())) {
    return { message: "Every card needs text (for a picture: what it shows)", status: "error" };
  }
  if (!exercise.noRightAnswer) {
    const empty = content.groups.findIndex((_group, index) => !exercise.cardGroups.includes(index));
    if (empty !== -1) return { message: `No card belongs in "${content.groups[empty]}"`, status: "error" };
  }
  if (exercise.listen && !exercise.speech) return { message: "Choose the language the cards are heard in", status: "error" };
  return { message: "Looks good", status: "valid" };
}

export function toShared(exercise: SortGroupsTestExercise): SharedSortGroupsTestExerciseDefinition {
  return {
    ...(exercise.cardImages.some((image) => image !== null) ? { cardImages: exercise.cardImages } : {}),
    cardGroups: exercise.cardGroups,
    kind: "sort-groups",
    ...(exercise.listen ? { listen: true } : {}),
    locales: filterValidLocaleEntries(
      Object.fromEntries(
        Object.entries(exercise.locales).map(([locale, content]) => [
          locale,
          { cards: content.cards, groups: content.groups, prompt: content.prompt, ...(content.hint ? { hint: content.hint } : {}) },
        ]),
      ),
    ),
    ...(exercise.noRightAnswer ? { noRightAnswer: true } : {}),
    tags: exercise.tagIds,
  };
}

export function fromShared(definition: SharedSortGroupsTestExerciseDefinition): SortGroupsTestExercise {
  const locales = Object.fromEntries(
    Object.entries(definition.locales).map(([locale, content]) => [
      locale,
      { cards: content?.cards ?? [], groups: content?.groups ?? [], hint: content?.hint ?? "", prompt: content?.prompt ?? "" },
    ]),
  );
  const speech = (definition as { speech?: unknown }).speech;
  return {
    cardGroups: definition.cardGroups,
    cardImages: definition.cardGroups.map((_group, index) => definition.cardImages?.[index] ?? null),
    id: createId("ex"),
    kind: "sort-groups",
    listen: definition.listen ?? false,
    locales,
    noRightAnswer: definition.noRightAnswer ?? false,
    ...(isValidExerciseSpeech(speech) ? { speech } : {}),
    tagIds: definition.tags,
  };
}
