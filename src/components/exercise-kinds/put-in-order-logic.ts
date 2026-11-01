import type { PutInOrderTestExercise, SolutionValidationResult } from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";
import type { SharedPutInOrderTestExerciseDefinition } from "@/lib/course-package";
import { MAX_ORDER_ITEMS, MIN_ORDER_ITEMS } from "@/lib/exercise-kinds/put-in-order";
import { isValidExerciseSpeech, type SpeechLanguage } from "@/lib/exercise-speech";
import type { Locale } from "@/lib/i18n";

// Put in order (SLJ-177) in the editor: the items in the right order, each
// one's text per language (for a picture, what it shows) and a picture shared
// by every language.

export { MAX_ORDER_ITEMS, MIN_ORDER_ITEMS };

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

const emptyContent = (count = 3) => ({ hint: "", items: Array.from({ length: count }, () => ""), prompt: "" });

export function createExercise(locales: Locale[]): PutInOrderTestExercise {
  return {
    id: createId("ex"),
    images: [null, null, null],
    kind: "put-in-order",
    listen: false,
    locales: Object.fromEntries(locales.map((locale) => [locale, emptyContent()])),
    tagIds: [],
  };
}

const itemCount = (exercise: PutInOrderTestExercise) => exercise.images.length;

function mapItems(exercise: PutInOrderTestExercise, change: <T>(items: T[], fill: T) => T[]): PutInOrderTestExercise {
  return {
    ...exercise,
    images: change(exercise.images, null),
    locales: Object.fromEntries(
      Object.entries(exercise.locales).map(([locale, content]) => [locale, { ...content, items: change(content.items, "") }]),
    ),
  };
}

export function updatePrompt(exercise: PutInOrderTestExercise, locale: Locale, prompt: string): PutInOrderTestExercise {
  const content = exercise.locales[locale] ?? emptyContent(itemCount(exercise));
  return { ...exercise, locales: { ...exercise.locales, [locale]: { ...content, prompt } } };
}

export function updateItemText(exercise: PutInOrderTestExercise, locale: Locale, index: number, text: string): PutInOrderTestExercise {
  const content = exercise.locales[locale] ?? emptyContent(itemCount(exercise));
  const items = content.items.map((item, itemIndex) => (itemIndex === index ? text : item));
  return { ...exercise, locales: { ...exercise.locales, [locale]: { ...content, items } } };
}

export function updateItemImage(exercise: PutInOrderTestExercise, index: number, image: string | null): PutInOrderTestExercise {
  return { ...exercise, images: exercise.images.map((current, imageIndex) => (imageIndex === index ? image : current)) };
}

export function addItem(exercise: PutInOrderTestExercise): PutInOrderTestExercise {
  if (itemCount(exercise) >= MAX_ORDER_ITEMS) return exercise;
  return mapItems(exercise, (items, fill) => [...items, fill]);
}

export function removeItem(exercise: PutInOrderTestExercise, index: number): PutInOrderTestExercise {
  if (itemCount(exercise) <= MIN_ORDER_ITEMS) return exercise;
  return mapItems(exercise, (items) => items.filter((_item, itemIndex) => itemIndex !== index));
}

// The order is the answer, so moving an item up or down changes it.
export function moveItem(exercise: PutInOrderTestExercise, index: number, offset: -1 | 1): PutInOrderTestExercise {
  const target = index + offset;
  if (target < 0 || target >= itemCount(exercise)) return exercise;
  return mapItems(exercise, (items) => {
    const moved = [...items];
    [moved[index], moved[target]] = [moved[target], moved[index]];
    return moved;
  });
}

// Heard items need a language to be read in: the course's, else English.
export function setListen(exercise: PutInOrderTestExercise, listen: boolean, locale: Locale): PutInOrderTestExercise {
  const lang: SpeechLanguage = locale === "sr" || locale === "sr-Cyrl" ? "sr" : "en";
  return { ...exercise, listen, ...(listen && !exercise.speech ? { speech: { lang } } : {}) };
}

export function validate(exercise: PutInOrderTestExercise, locale: Locale): SolutionValidationResult {
  const content = exercise.locales[locale];
  if (!content) return { status: "idle" };
  const hasPicture = exercise.images.some((image) => image !== null);
  if (content.items.every((item) => !item.trim()) && !hasPicture) return { status: "idle" };

  if (content.items.length < MIN_ORDER_ITEMS) return { message: `Add at least ${MIN_ORDER_ITEMS} items`, status: "error" };
  if (content.items.some((item) => !item.trim())) {
    return { message: "Every item needs text (for a picture: what it shows)", status: "error" };
  }
  if (new Set(content.items.map((item) => item.trim().toLocaleLowerCase())).size !== content.items.length) {
    return { message: "Two items are the same: the student couldn't tell which goes where", status: "error" };
  }
  if (exercise.listen && !exercise.speech) return { message: "Choose the language the items are heard in", status: "error" };
  return { message: "Looks good", status: "valid" };
}

export function toShared(exercise: PutInOrderTestExercise): SharedPutInOrderTestExerciseDefinition {
  return {
    ...(exercise.images.some((image) => image !== null) ? { images: exercise.images } : {}),
    kind: "put-in-order",
    ...(exercise.listen ? { listen: true } : {}),
    locales: filterValidLocaleEntries(
      Object.fromEntries(
        Object.entries(exercise.locales).map(([locale, content]) => [
          locale,
          { items: content.items, prompt: content.prompt, ...(content.hint ? { hint: content.hint } : {}) },
        ]),
      ),
    ),
    tags: exercise.tagIds,
  };
}

export function fromShared(definition: SharedPutInOrderTestExerciseDefinition): PutInOrderTestExercise {
  const locales = Object.fromEntries(
    Object.entries(definition.locales).map(([locale, content]) => [
      locale,
      { hint: content?.hint ?? "", items: content?.items ?? [], prompt: content?.prompt ?? "" },
    ]),
  );
  const count = Object.values(locales)[0]?.items.length ?? MIN_ORDER_ITEMS;
  const speech = (definition as { speech?: unknown }).speech;

  return {
    id: createId("ex"),
    images: Array.from({ length: count }, (_unused, index) => definition.images?.[index] ?? null),
    kind: "put-in-order",
    listen: definition.listen ?? false,
    locales,
    ...(isValidExerciseSpeech(speech) ? { speech } : {}),
    tagIds: definition.tags,
  };
}
