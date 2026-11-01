import { matkoAssetUrl } from "../course-assets";
import { resolveAssetFilename } from "../course-asset-id";
import type {
  ListenChooseCourseExercise,
  MultipleChoiceCourseExercise,
  SharedListenChooseTestExerciseDefinition,
} from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isValidExerciseSpeech } from "../exercise-speech";
import { isLocale } from "../i18n";

import { multipleChoiceExerciseRuntime, normalizeMultipleChoiceCorrectOptions } from "./multiple-choice";
import { hasValidTags, type ExerciseKindRuntime, type GradeResult, type ReviewPart, type ResolveForPlayerContext } from "./types";

// Listen and choose (SLJ-175): the student hears a word or sentence they can't
// see (`spoken`, in the exercise's `speech.lang`) and picks the matching
// option, a picture or text. Checked exactly like multiple choice: the same
// correct indexes, selection mode and answer encoding.

function isValid(exercise: Record<string, unknown>): exercise is SharedListenChooseTestExerciseDefinition {
  if (!hasValidTags(exercise) || !isValidExerciseSpeech(exercise.speech)) return false;
  if (typeof exercise.spoken !== "string" || exercise.spoken.trim() === "") return false;
  if (!exercise.locales || typeof exercise.locales !== "object") return false;

  const localeEntries = Object.entries(exercise.locales as Record<string, unknown>);
  const localesAreValid = localeEntries.every(([locale, content]) => {
    if (!isLocale(locale) || !content || typeof content !== "object") return false;
    const { hint, options, prompt } = content as { hint?: unknown; options?: unknown; prompt?: unknown };
    return (
      typeof prompt === "string" &&
      (hint === undefined || typeof hint === "string") &&
      Array.isArray(options) &&
      options.length >= 2 &&
      options.every((option) => typeof option === "string")
    );
  });
  if (!localesAreValid) return false;

  const optionCount = (localeEntries[0]?.[1] as { options?: string[] } | undefined)?.options?.length ?? 0;
  const images = exercise.optionImages;
  if (
    images !== undefined &&
    !(
      Array.isArray(images) &&
      images.length === optionCount &&
      images.every((image) => image === null || (typeof image === "string" && resolveAssetFilename(image) !== null))
    )
  ) {
    return false;
  }

  const normalized = normalizeMultipleChoiceCorrectOptions(exercise);
  if (!normalized || normalized.correctOptionIndexes.length === 0) return false;
  if (normalized.selectionMode === "single" && normalized.correctOptionIndexes.length !== 1) return false;
  return localeEntries.every(([, content]) =>
    normalized.correctOptionIndexes.every((index) => index < (content as { options: string[] }).options.length),
  );
}

function resolveForPlayer(
  shared: SharedListenChooseTestExerciseDefinition,
  context: ResolveForPlayerContext,
): ListenChooseCourseExercise {
  const normalized = normalizeMultipleChoiceCorrectOptions(shared) ?? {
    correctOptionIndexes: [],
    selectionMode: "single" as const,
  };
  const options =
    context.requestedLocales.map((locale) => shared.locales[locale]?.options).find((value) => Array.isArray(value)) ?? [];

  return {
    correctOptionIndexes: normalized.correctOptionIndexes,
    hint: context.hint,
    id: context.id,
    kind: "listen-choose",
    optionImageUrls: options.map((_option, index) => {
      const image = shared.optionImages?.[index];
      return image ? matkoAssetUrl(context.courseId, image) : null;
    }),
    options,
    prompt: context.prompt,
    selectionMode: normalized.selectionMode,
    spoken: shared.spoken,
    tags: shared.tags,
  };
}

// Grading and the summary are multiple choice's: they read only the options
// and which are correct, which this kind has in the same shape.
const asChoice = (exercise: ListenChooseCourseExercise) => exercise as unknown as MultipleChoiceCourseExercise;

function buildInstance(exercise: ListenChooseCourseExercise): ExerciseInstance {
  const instance = multipleChoiceExerciseRuntime.buildInstance(asChoice(exercise));
  return { kind: "listen-choose", optionOrder: instance.kind === "multiple-choice" ? instance.optionOrder : [] };
}

function grade(exercise: ListenChooseCourseExercise, instance: ExerciseInstance, rawAnswer: string): GradeResult {
  return multipleChoiceExerciseRuntime.grade(asChoice(exercise), instance, rawAnswer);
}

function review(exercise: ListenChooseCourseExercise, instance: ExerciseInstance, rawAnswer: string): ReviewPart[] {
  return multipleChoiceExerciseRuntime.review?.(asChoice(exercise), instance, rawAnswer) ?? [];
}

export const listenChooseExerciseRuntime: ExerciseKindRuntime<
  SharedListenChooseTestExerciseDefinition,
  ListenChooseCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "listen-choose",
  resolveForPlayer,
  review,
};
