import type { SharedMultipleChoiceTestExerciseDefinition } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { normalizeMultipleChoiceCorrectOptions } from "@/lib/exercise-kinds/multiple-choice";

import type {
  MultipleChoiceTestExercise,
  SolutionValidationResult,
} from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function createExerciseLocaleMap(locales: Locale[]) {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        hint: "",
        options: ["", ""],
        prompt: "",
      },
    ]),
  );
}

export function createExercise(locales: Locale[]): MultipleChoiceTestExercise {
  return {
    kind: "multiple-choice",
    correctOptionIndexes: [],
    id: createId("ex"),
    locales: createExerciseLocaleMap(locales),
    selectionMode: "multiple",
    tagIds: [],
  };
}

export function updatePrompt(
  exercise: MultipleChoiceTestExercise,
  locale: Locale,
  prompt: string,
): MultipleChoiceTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: {
        ...(exercise.locales[locale] ?? { hint: "", options: ["", ""], prompt: "" }),
        prompt,
      },
    },
  };
}

export function updateHint(
  exercise: MultipleChoiceTestExercise,
  locale: Locale,
  hint: string,
): MultipleChoiceTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: {
        ...(exercise.locales[locale] ?? { hint: "", options: ["", ""], prompt: "" }),
        hint,
      },
    },
  };
}

// Option count/order is a structural property shared across every locale
// (`correctOptionIndex` is a position, not text), so adding/removing an
// option applies to every locale's `options` array at once — only the text
// of an existing option is edited within a single locale.
export function addOption(exercise: MultipleChoiceTestExercise): MultipleChoiceTestExercise {
  return {
    ...exercise,
    locales: Object.fromEntries(
      Object.entries(exercise.locales).map(([locale, content]) => [
        locale,
        { ...content, options: [...content.options, ""] },
      ]),
    ),
  };
}

export function removeOption(
  exercise: MultipleChoiceTestExercise,
  optionIndex: number,
): MultipleChoiceTestExercise {
  return {
    ...exercise,
    correctOptionIndexes: exercise.correctOptionIndexes
      .filter((index) => index !== optionIndex)
      .map((index) => (index > optionIndex ? index - 1 : index)),
    locales: Object.fromEntries(
      Object.entries(exercise.locales).map(([locale, content]) => [
        locale,
        {
          ...content,
          options: content.options.filter((_option, index) => index !== optionIndex),
        },
      ]),
    ),
  };
}

export function updateOptionText(
  exercise: MultipleChoiceTestExercise,
  locale: Locale,
  optionIndex: number,
  text: string,
): MultipleChoiceTestExercise {
  const content = exercise.locales[locale] ?? { hint: "", options: [], prompt: "" };

  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: {
        ...content,
        options: content.options.map((option, index) =>
          index === optionIndex ? text : option,
        ),
      },
    },
  };
}

export function toggleCorrectOption(
  exercise: MultipleChoiceTestExercise,
  optionIndex: number,
): MultipleChoiceTestExercise {
  if (exercise.selectionMode === "single") {
    return { ...exercise, correctOptionIndexes: [optionIndex] };
  }

  return {
    ...exercise,
    correctOptionIndexes: exercise.correctOptionIndexes.includes(optionIndex)
      ? exercise.correctOptionIndexes.filter((index) => index !== optionIndex)
      : [...exercise.correctOptionIndexes, optionIndex].sort((a, b) => a - b),
  };
}

// Switching to single-answer mode collapses more than one marked option down
// to just the first — a radio group can't represent multiple correct answers,
// and silently dropping the rest (rather than blocking the switch) matches
// how removeOption already resolves a similar structural conflict.
export function setSelectionMode(
  exercise: MultipleChoiceTestExercise,
  selectionMode: "single" | "multiple",
): MultipleChoiceTestExercise {
  return {
    ...exercise,
    correctOptionIndexes:
      selectionMode === "single"
        ? exercise.correctOptionIndexes.slice(0, 1)
        : exercise.correctOptionIndexes,
    selectionMode,
  };
}

export function validate(
  exercise: MultipleChoiceTestExercise,
  locale: Locale,
): SolutionValidationResult {
  const content = exercise.locales[locale];

  if (!content) {
    return { status: "idle" };
  }

  const hasAnyText = content.options.some((option) => option.trim().length > 0);

  if (!hasAnyText) {
    return { status: "idle" };
  }

  const nonEmptyOptions = content.options.filter((option) => option.trim().length > 0);

  if (content.options.length < 2 || nonEmptyOptions.length < content.options.length) {
    return { message: "Every option needs text", status: "error" };
  }

  const uniqueOptions = new Set(
    content.options.map((option) => option.trim().toLowerCase()),
  );

  if (uniqueOptions.size !== content.options.length) {
    return { message: "Options must be unique", status: "error" };
  }

  const hasValidRange = exercise.correctOptionIndexes.every(
    (index) => Number.isInteger(index) && index >= 0 && index < content.options.length,
  );

  if (!hasValidRange) {
    return { message: "Mark a valid option as correct", status: "error" };
  }

  if (exercise.selectionMode === "single" && exercise.correctOptionIndexes.length !== 1) {
    return { message: "Mark one option as correct", status: "error" };
  }

  return { message: "Looks good", status: "valid" };
}

export function toShared(
  exercise: MultipleChoiceTestExercise,
): SharedMultipleChoiceTestExerciseDefinition {
  return {
    kind: "multiple-choice",
    correctOptionIndexes: exercise.correctOptionIndexes,
    locales: filterValidLocaleEntries(exercise.locales),
    selectionMode: exercise.selectionMode,
    tags: exercise.tagIds,
  };
}

export function fromShared(
  definition: SharedMultipleChoiceTestExerciseDefinition,
): MultipleChoiceTestExercise {
  // `definition` may still be the on-disk legacy shape (a plain
  // `correctOptionIndex: number`, no `selectionMode`) at runtime even though
  // its static type is the current one — same defensive normalization as the
  // player's `resolveForPlayer`.
  const normalized = normalizeMultipleChoiceCorrectOptions(definition) ?? {
    correctOptionIndexes: [],
    selectionMode: "multiple" as const,
  };

  return {
    kind: "multiple-choice",
    correctOptionIndexes: normalized.correctOptionIndexes,
    id: createId("ex"),
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [
        locale,
        {
          hint: content?.hint ?? "",
          options: content?.options ?? ["", ""],
          prompt: content?.prompt ?? "",
        },
      ]),
    ),
    selectionMode: normalized.selectionMode,
    tagIds: definition.tags,
  };
}
