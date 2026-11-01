import type { MatchPairsTestExercise, SolutionValidationResult } from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";
import type { SharedMatchPairsTestExerciseDefinition } from "@/lib/course-package";
import { MAX_PAIRS, MIN_PAIRS } from "@/lib/exercise-kinds/match-pairs";
import { isValidExerciseSpeech, type SpeechLanguage } from "@/lib/exercise-speech";
import type { Locale } from "@/lib/i18n";

// Match the pairs (SLJ-176) in the editor: rows of pairs, each side's text
// per language (for a picture, what it shows) and a picture per side shared
// by every language.

export { MAX_PAIRS, MIN_PAIRS };

export type PairSide = "left" | "right";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

const emptyContent = (count = 3) => ({
  hint: "",
  left: Array.from({ length: count }, () => ""),
  prompt: "",
  right: Array.from({ length: count }, () => ""),
});

export function createExercise(locales: Locale[]): MatchPairsTestExercise {
  return {
    id: createId("ex"),
    kind: "match-pairs",
    leftImages: [null, null, null],
    listenLeft: false,
    locales: Object.fromEntries(locales.map((locale) => [locale, emptyContent()])),
    rightImages: [null, null, null],
    tagIds: [],
  };
}

const pairCount = (exercise: MatchPairsTestExercise) => exercise.leftImages.length;

function mapLocales(
  exercise: MatchPairsTestExercise,
  change: (content: MatchPairsTestExercise["locales"][string]) => MatchPairsTestExercise["locales"][string],
) {
  return Object.fromEntries(Object.entries(exercise.locales).map(([locale, content]) => [locale, change(content)]));
}

export function updatePrompt(exercise: MatchPairsTestExercise, locale: Locale, prompt: string): MatchPairsTestExercise {
  const content = exercise.locales[locale] ?? emptyContent(pairCount(exercise));
  return { ...exercise, locales: { ...exercise.locales, [locale]: { ...content, prompt } } };
}

export function updateItemText(
  exercise: MatchPairsTestExercise,
  locale: Locale,
  side: PairSide,
  index: number,
  text: string,
): MatchPairsTestExercise {
  const content = exercise.locales[locale] ?? emptyContent(pairCount(exercise));
  const items = content[side].map((item, itemIndex) => (itemIndex === index ? text : item));
  return { ...exercise, locales: { ...exercise.locales, [locale]: { ...content, [side]: items } } };
}

export function updateItemImage(exercise: MatchPairsTestExercise, side: PairSide, index: number, image: string | null) {
  const key = side === "left" ? "leftImages" : "rightImages";
  return { ...exercise, [key]: exercise[key].map((current, imageIndex) => (imageIndex === index ? image : current)) };
}

// A pair is a row in every language at once, with its two pictures.
export function addPair(exercise: MatchPairsTestExercise): MatchPairsTestExercise {
  if (pairCount(exercise) >= MAX_PAIRS) return exercise;
  return {
    ...exercise,
    leftImages: [...exercise.leftImages, null],
    locales: mapLocales(exercise, (content) => ({ ...content, left: [...content.left, ""], right: [...content.right, ""] })),
    rightImages: [...exercise.rightImages, null],
  };
}

export function removePair(exercise: MatchPairsTestExercise, index: number): MatchPairsTestExercise {
  if (pairCount(exercise) <= MIN_PAIRS) return exercise;
  const without = <T>(items: T[]) => items.filter((_item, itemIndex) => itemIndex !== index);
  return {
    ...exercise,
    leftImages: without(exercise.leftImages),
    locales: mapLocales(exercise, (content) => ({ ...content, left: without(content.left), right: without(content.right) })),
    rightImages: without(exercise.rightImages),
  };
}

// Heard items need a language to be read in: the course's, else English.
export function setListenLeft(exercise: MatchPairsTestExercise, listenLeft: boolean, locale: Locale): MatchPairsTestExercise {
  const lang: SpeechLanguage = locale === "sr" || locale === "sr-Cyrl" ? "sr" : "en";
  return { ...exercise, listenLeft, ...(listenLeft && !exercise.speech ? { speech: { lang } } : {}) };
}

export function validate(exercise: MatchPairsTestExercise, locale: Locale): SolutionValidationResult {
  const content = exercise.locales[locale];
  if (!content) return { status: "idle" };
  const items = [...content.left, ...content.right];
  const hasPicture = [...exercise.leftImages, ...exercise.rightImages].some((image) => image !== null);
  if (items.every((item) => !item.trim()) && !hasPicture) return { status: "idle" };

  if (content.left.length < MIN_PAIRS) return { message: `Add at least ${MIN_PAIRS} pairs`, status: "error" };
  // A picture's text is its alt text, needed too.
  if (items.some((item) => !item.trim())) {
    return { message: "Every item needs text (for a picture: what it shows)", status: "error" };
  }
  const repeated = (list: string[]) => new Set(list.map((item) => item.trim().toLocaleLowerCase())).size !== list.length;
  if (repeated(content.left) || repeated(content.right)) {
    return { message: "Two items in a column are the same: the student couldn't tell them apart", status: "error" };
  }
  if (exercise.listenLeft && !exercise.speech) return { message: "Choose the language the left items are heard in", status: "error" };
  return { message: "Looks good", status: "valid" };
}

export function toShared(exercise: MatchPairsTestExercise): SharedMatchPairsTestExerciseDefinition {
  const images = (list: (string | null)[]) => (list.some((image) => image !== null) ? list : undefined);
  const leftImages = images(exercise.leftImages);
  const rightImages = images(exercise.rightImages);
  return {
    kind: "match-pairs",
    ...(leftImages ? { leftImages } : {}),
    ...(exercise.listenLeft ? { listenLeft: true } : {}),
    locales: filterValidLocaleEntries(
      Object.fromEntries(
        Object.entries(exercise.locales).map(([locale, content]) => [
          locale,
          { left: content.left, prompt: content.prompt, right: content.right, ...(content.hint ? { hint: content.hint } : {}) },
        ]),
      ),
    ),
    ...(rightImages ? { rightImages } : {}),
    tags: exercise.tagIds,
  };
}

export function fromShared(definition: SharedMatchPairsTestExerciseDefinition): MatchPairsTestExercise {
  const locales = Object.fromEntries(
    Object.entries(definition.locales).map(([locale, content]) => [
      locale,
      { hint: content?.hint ?? "", left: content?.left ?? [], prompt: content?.prompt ?? "", right: content?.right ?? [] },
    ]),
  );
  const count = Object.values(locales)[0]?.left.length ?? MIN_PAIRS;
  const images = (list: (string | null)[] | undefined) => Array.from({ length: count }, (_unused, index) => list?.[index] ?? null);
  const speech = (definition as { speech?: unknown }).speech;

  return {
    id: createId("ex"),
    kind: "match-pairs",
    leftImages: images(definition.leftImages),
    listenLeft: definition.listenLeft ?? false,
    locales,
    rightImages: images(definition.rightImages),
    ...(isValidExerciseSpeech(speech) ? { speech } : {}),
    tagIds: definition.tags,
  };
}
