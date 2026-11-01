import type { FindInPictureTestExercise, SolutionValidationResult } from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";
import type { PictureArea, SharedFindInPictureTestExerciseDefinition } from "@/lib/course-package";
import { MAX_AREAS, SMALL_AREA } from "@/lib/exercise-kinds/find-in-picture";
import { isValidExerciseSpeech } from "@/lib/exercise-speech";
import type { Locale } from "@/lib/i18n";

// Find in the picture (SLJ-179) in the editor: the picture, the areas drawn
// on it (shared by every language), and per language the instruction, the
// picture's alt text and the areas' names.

export { MAX_AREAS, SMALL_AREA };

type Content = FindInPictureTestExercise["locales"][string];

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

const emptyContent = (areas = 0): Content => ({
  areaLabels: Array.from({ length: areas }, () => ""),
  hint: "",
  imageAlt: "",
  prompt: "",
});

export function createExercise(locales: Locale[]): FindInPictureTestExercise {
  return {
    areas: [],
    id: createId("ex"),
    imageAssetFilename: null,
    kind: "find-in-picture",
    locales: Object.fromEntries(locales.map((locale) => [locale, emptyContent()])),
    tagIds: [],
  };
}

function withContent(exercise: FindInPictureTestExercise, locale: Locale, change: (content: Content) => Content) {
  const content = exercise.locales[locale] ?? emptyContent(exercise.areas.length);
  return { ...exercise, locales: { ...exercise.locales, [locale]: change(content) } };
}

function mapLocales(exercise: FindInPictureTestExercise, change: (content: Content) => Content) {
  return Object.fromEntries(Object.entries(exercise.locales).map(([locale, content]) => [locale, change(content)]));
}

export const updatePrompt = (exercise: FindInPictureTestExercise, locale: Locale, prompt: string) =>
  withContent(exercise, locale, (content) => ({ ...content, prompt }));

export const updateImageAlt = (exercise: FindInPictureTestExercise, locale: Locale, imageAlt: string) =>
  withContent(exercise, locale, (content) => ({ ...content, imageAlt }));

export const updateAreaLabel = (exercise: FindInPictureTestExercise, locale: Locale, index: number, label: string) =>
  withContent(exercise, locale, (content) => ({
    ...content,
    areaLabels: exercise.areas.map((_area, areaIndex) => (areaIndex === index ? label : (content.areaLabels[areaIndex] ?? ""))),
  }));

export const setImage = (exercise: FindInPictureTestExercise, imageAssetFilename: string | null): FindInPictureTestExercise => ({
  ...exercise,
  imageAssetFilename,
});

const clamp = (value: number) => Math.min(1, Math.max(0, value));

// A new area from a rectangle dragged on the picture (fractions, any corner
// first). The first one drawn is the right answer; later ones aren't until
// marked, so a teacher can draw decoys too.
export function addArea(
  exercise: FindInPictureTestExercise,
  from: { x: number; y: number },
  to: { x: number; y: number },
  shape: PictureArea["shape"] = "rect",
): FindInPictureTestExercise {
  if (exercise.areas.length >= MAX_AREAS) return exercise;
  const x = clamp(Math.min(from.x, to.x));
  const y = clamp(Math.min(from.y, to.y));
  const area: PictureArea = {
    correct: exercise.areas.length === 0,
    height: clamp(Math.max(from.y, to.y)) - y,
    id: createId("area"),
    shape,
    width: clamp(Math.max(from.x, to.x)) - x,
    x,
    y,
  };
  if (area.width <= 0 || area.height <= 0) return exercise;
  return {
    ...exercise,
    areas: [...exercise.areas, area],
    locales: mapLocales(exercise, (content) => ({ ...content, areaLabels: [...content.areaLabels, ""] })),
  };
}

export function updateArea(exercise: FindInPictureTestExercise, index: number, change: Partial<PictureArea>): FindInPictureTestExercise {
  return { ...exercise, areas: exercise.areas.map((area, areaIndex) => (areaIndex === index ? { ...area, ...change } : area)) };
}

export function removeArea(exercise: FindInPictureTestExercise, index: number): FindInPictureTestExercise {
  return {
    ...exercise,
    areas: exercise.areas.filter((_area, areaIndex) => areaIndex !== index),
    locales: mapLocales(exercise, (content) => ({
      ...content,
      areaLabels: content.areaLabels.filter((_label, labelIndex) => labelIndex !== index),
    })),
  };
}

// An area placed on the picture, as CSS percentages.
export const areaStyle = (area: PictureArea) => ({
  height: `${area.height * 100}%`,
  left: `${area.x * 100}%`,
  top: `${area.y * 100}%`,
  width: `${area.width * 100}%`,
});

export const isSmallArea = (area: PictureArea) => area.width < SMALL_AREA || area.height < SMALL_AREA;

export function validate(exercise: FindInPictureTestExercise, locale: Locale): SolutionValidationResult {
  const content = exercise.locales[locale];
  if (!content) return { status: "idle" };
  if (!exercise.imageAssetFilename && !content.prompt.trim()) return { status: "idle" };

  if (!exercise.imageAssetFilename) return { message: "Add a picture", status: "error" };
  if (!content.imageAlt.trim()) return { message: "Say what the picture shows (for screen readers)", status: "error" };
  if (exercise.areas.length === 0) return { message: "Draw an area on the picture: drag across what the student should find", status: "error" };
  if (!exercise.areas.some((area) => area.correct)) return { message: "Mark at least one area as right", status: "error" };
  return { message: "Looks good", status: "valid" };
}

export function toShared(exercise: FindInPictureTestExercise): SharedFindInPictureTestExerciseDefinition {
  return {
    areas: exercise.areas,
    imageAssetFilename: exercise.imageAssetFilename ?? "",
    kind: "find-in-picture",
    locales: filterValidLocaleEntries(
      Object.fromEntries(
        Object.entries(exercise.locales).map(([locale, content]) => [
          locale,
          {
            imageAlt: content.imageAlt,
            prompt: content.prompt,
            ...(content.areaLabels.some((label) => label.trim()) ? { areaLabels: content.areaLabels } : {}),
            ...(content.hint ? { hint: content.hint } : {}),
          },
        ]),
      ),
    ),
    tags: exercise.tagIds,
  };
}

export function fromShared(definition: SharedFindInPictureTestExerciseDefinition): FindInPictureTestExercise {
  const speech = (definition as { speech?: unknown }).speech;
  return {
    areas: definition.areas,
    id: createId("ex"),
    imageAssetFilename: definition.imageAssetFilename || null,
    kind: "find-in-picture",
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [
        locale,
        {
          areaLabels: definition.areas.map((_area, index) => content?.areaLabels?.[index] ?? ""),
          hint: content?.hint ?? "",
          imageAlt: content?.imageAlt ?? "",
          prompt: content?.prompt ?? "",
        },
      ]),
    ),
    ...(isValidExerciseSpeech(speech) ? { speech } : {}),
    tagIds: definition.tags,
  };
}
