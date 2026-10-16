import type { SharedPunctuationTestExerciseDefinition } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { DEFAULT_PUNCTUATION_MARKS, normalizeMarks, parsePunctuationText } from "@/lib/punctuation";

import type {
  PunctuationExerciseLocaleContent,
  PunctuationTestExercise,
  SolutionValidationResult,
} from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyLocaleContent(): PunctuationExerciseLocaleContent {
  return { hint: "", prompt: "", text: "" };
}

export function createExercise(locales: Locale[]): PunctuationTestExercise {
  return {
    id: createId("ex"),
    kind: "punctuation",
    locales: Object.fromEntries(locales.map((locale) => [locale, emptyLocaleContent()])),
    marks: "",
    tagIds: [],
  };
}

// The marks as the editor holds them: one string, each character a mark;
// empty means the default set.
export function marksFromText(text: string): string[] {
  return normalizeMarks([...text.replace(/\s+/g, "")]);
}

function updateLocale(
  exercise: PunctuationTestExercise,
  locale: Locale,
  change: Partial<PunctuationExerciseLocaleContent>,
): PunctuationTestExercise {
  return {
    ...exercise,
    locales: { ...exercise.locales, [locale]: { ...(exercise.locales[locale] ?? emptyLocaleContent()), ...change } },
  };
}

export const updatePrompt = (exercise: PunctuationTestExercise, locale: Locale, prompt: string) =>
  updateLocale(exercise, locale, { prompt });

export const updateText = (exercise: PunctuationTestExercise, locale: Locale, text: string) =>
  updateLocale(exercise, locale, { text });

export function updateMarks(exercise: PunctuationTestExercise, marks: string): PunctuationTestExercise {
  return { ...exercise, marks };
}

export function validate(exercise: PunctuationTestExercise, locale: Locale): SolutionValidationResult {
  const text = exercise.locales[locale]?.text ?? "";
  if (text.trim().length === 0) return { status: "idle" };
  if (!parsePunctuationText(text, marksFromText(exercise.marks)).gaps.some(Boolean)) {
    return { message: "Write the sentence with its punctuation marks", status: "error" };
  }
  return { message: "Looks good", status: "valid" };
}

export function toShared(exercise: PunctuationTestExercise): SharedPunctuationTestExerciseDefinition {
  const marks = marksFromText(exercise.marks);
  const isDefault = marks.join("") === DEFAULT_PUNCTUATION_MARKS.join("");
  return {
    kind: "punctuation",
    locales: filterValidLocaleEntries(
      Object.fromEntries(
        Object.entries(exercise.locales).map(([locale, content]) => [
          locale,
          { hint: content.hint, prompt: content.prompt, text: content.text },
        ]),
      ),
    ),
    ...(exercise.marks.trim() && !isDefault ? { marks } : {}),
    tags: exercise.tagIds,
  };
}

export function fromShared(definition: SharedPunctuationTestExerciseDefinition): PunctuationTestExercise {
  return {
    id: createId("ex"),
    kind: "punctuation",
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [
        locale,
        { hint: content?.hint ?? "", prompt: content?.prompt ?? "", text: content?.text ?? "" },
      ]),
    ),
    marks: definition.marks ? definition.marks.join("") : "",
    tagIds: definition.tags,
  };
}
