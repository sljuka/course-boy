import type { ListenChooseTestExercise, SolutionValidationResult } from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";
import type { SharedListenChooseTestExerciseDefinition } from "@/lib/course-package";
import { normalizeMultipleChoiceCorrectOptions } from "@/lib/exercise-kinds/multiple-choice";
import { isValidExerciseSpeech, type SpeechLanguage } from "@/lib/exercise-speech";
import type { Locale } from "@/lib/i18n";

// Listen and choose (SLJ-175) in the editor: what's said (one text, in the
// exercise's speech language), the visible instruction and each option's text
// per language, and a picture per option.

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

const emptyContent = () => ({ hint: "", options: ["", ""], prompt: "" });

// The language heard: the course's when it's one a voice can speak, else English.
function defaultSpeechLanguage(locales: Locale[]): SpeechLanguage {
  const first = locales[0];
  return first === "sr" || first === "sr-Cyrl" ? "sr" : "en";
}

export function createExercise(locales: Locale[]): ListenChooseTestExercise {
  return {
    correctOptionIndexes: [],
    id: createId("ex"),
    kind: "listen-choose",
    locales: Object.fromEntries(locales.map((locale) => [locale, emptyContent()])),
    optionImages: [null, null],
    selectionMode: "single",
    speech: { lang: defaultSpeechLanguage(locales) },
    spoken: "",
    tagIds: [],
  };
}

function withContent(
  exercise: ListenChooseTestExercise,
  locale: Locale,
  change: (content: ListenChooseTestExercise["locales"][string]) => ListenChooseTestExercise["locales"][string],
): ListenChooseTestExercise {
  return {
    ...exercise,
    locales: { ...exercise.locales, [locale]: change(exercise.locales[locale] ?? emptyContent()) },
  };
}

export const updatePrompt = (exercise: ListenChooseTestExercise, locale: Locale, prompt: string) =>
  withContent(exercise, locale, (content) => ({ ...content, prompt }));

export const updateOptionText = (exercise: ListenChooseTestExercise, locale: Locale, index: number, text: string) =>
  withContent(exercise, locale, (content) => ({
    ...content,
    options: content.options.map((option, optionIndex) => (optionIndex === index ? text : option)),
  }));

export function updateOptionImage(exercise: ListenChooseTestExercise, index: number, image: string | null) {
  return { ...exercise, optionImages: exercise.optionImages.map((current, imageIndex) => (imageIndex === index ? image : current)) };
}

// Options are positions shared by every language: adding or removing one
// changes every language's list and the pictures together.
export function addOption(exercise: ListenChooseTestExercise): ListenChooseTestExercise {
  return {
    ...exercise,
    locales: Object.fromEntries(
      Object.entries(exercise.locales).map(([locale, content]) => [locale, { ...content, options: [...content.options, ""] }]),
    ),
    optionImages: [...exercise.optionImages, null],
  };
}

export function removeOption(exercise: ListenChooseTestExercise, index: number): ListenChooseTestExercise {
  return {
    ...exercise,
    correctOptionIndexes: exercise.correctOptionIndexes
      .filter((correct) => correct !== index)
      .map((correct) => (correct > index ? correct - 1 : correct)),
    locales: Object.fromEntries(
      Object.entries(exercise.locales).map(([locale, content]) => [
        locale,
        { ...content, options: content.options.filter((_option, optionIndex) => optionIndex !== index) },
      ]),
    ),
    optionImages: exercise.optionImages.filter((_image, imageIndex) => imageIndex !== index),
  };
}

export function toggleCorrectOption(exercise: ListenChooseTestExercise, index: number): ListenChooseTestExercise {
  if (exercise.selectionMode === "single") return { ...exercise, correctOptionIndexes: [index] };
  return {
    ...exercise,
    correctOptionIndexes: exercise.correctOptionIndexes.includes(index)
      ? exercise.correctOptionIndexes.filter((correct) => correct !== index)
      : [...exercise.correctOptionIndexes, index].sort((a, b) => a - b),
  };
}

export function setSelectionMode(exercise: ListenChooseTestExercise, selectionMode: "single" | "multiple") {
  return {
    ...exercise,
    correctOptionIndexes: selectionMode === "single" ? exercise.correctOptionIndexes.slice(0, 1) : exercise.correctOptionIndexes,
    selectionMode,
  };
}

export function validate(exercise: ListenChooseTestExercise, locale: Locale): SolutionValidationResult {
  const content = exercise.locales[locale];
  if (!content) return { status: "idle" };
  if (!exercise.spoken.trim() && content.options.every((option) => !option.trim())) return { status: "idle" };

  if (!exercise.spoken.trim()) return { message: "Write what the student hears", status: "error" };
  if (!exercise.speech) return { message: "Choose the language of what's heard", status: "error" };
  if (content.options.length < 2) return { message: "Add at least two options", status: "error" };
  // A picture's text is its alt text, needed too.
  if (content.options.some((option) => !option.trim())) {
    return { message: "Every option needs text (for a picture: what it shows)", status: "error" };
  }
  if (exercise.correctOptionIndexes.length === 0) return { message: "Mark the right option", status: "error" };
  if (exercise.selectionMode === "single" && exercise.correctOptionIndexes.length !== 1) {
    return { message: "Mark one option as correct", status: "error" };
  }
  return { message: "Looks good", status: "valid" };
}

export function toShared(exercise: ListenChooseTestExercise): SharedListenChooseTestExerciseDefinition {
  const hasImages = exercise.optionImages.some((image) => image !== null);
  return {
    correctOptionIndexes: exercise.correctOptionIndexes,
    kind: "listen-choose",
    locales: filterValidLocaleEntries(exercise.locales),
    ...(hasImages ? { optionImages: exercise.optionImages } : {}),
    selectionMode: exercise.selectionMode,
    spoken: exercise.spoken,
    tags: exercise.tagIds,
  };
}

export function fromShared(definition: SharedListenChooseTestExerciseDefinition): ListenChooseTestExercise {
  const normalized = normalizeMultipleChoiceCorrectOptions(definition) ?? {
    correctOptionIndexes: [],
    selectionMode: "single" as const,
  };
  const locales = Object.fromEntries(
    Object.entries(definition.locales).map(([locale, content]) => [
      locale,
      { hint: content?.hint ?? "", options: content?.options ?? ["", ""], prompt: content?.prompt ?? "" },
    ]),
  );
  const optionCount = Object.values(locales)[0]?.options.length ?? 2;
  const speech = (definition as { speech?: unknown }).speech;

  return {
    correctOptionIndexes: normalized.correctOptionIndexes,
    id: createId("ex"),
    kind: "listen-choose",
    locales,
    optionImages: Array.from({ length: optionCount }, (_unused, index) => definition.optionImages?.[index] ?? null),
    selectionMode: normalized.selectionMode,
    ...(isValidExerciseSpeech(speech) ? { speech } : {}),
    spoken: definition.spoken ?? "",
    tagIds: definition.tags,
  };
}
