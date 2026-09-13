import type { SharedMultipleChoiceTestExerciseDefinition } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";

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
    correctOptionIndex: 0,
    id: createId("ex"),
    locales: createExerciseLocaleMap(locales),
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
    correctOptionIndex:
      exercise.correctOptionIndex === optionIndex
        ? 0
        : exercise.correctOptionIndex > optionIndex
          ? exercise.correctOptionIndex - 1
          : exercise.correctOptionIndex,
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

export function setCorrectOption(
  exercise: MultipleChoiceTestExercise,
  optionIndex: number,
): MultipleChoiceTestExercise {
  return {
    ...exercise,
    correctOptionIndex: optionIndex,
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

  if (
    !Number.isInteger(exercise.correctOptionIndex) ||
    exercise.correctOptionIndex < 0 ||
    exercise.correctOptionIndex >= content.options.length
  ) {
    return { message: "Mark one option as correct", status: "error" };
  }

  return { message: "Looks good", status: "valid" };
}

export function toShared(
  exercise: MultipleChoiceTestExercise,
): SharedMultipleChoiceTestExerciseDefinition {
  return {
    kind: "multiple-choice",
    correctOptionIndex: exercise.correctOptionIndex,
    locales: filterValidLocaleEntries(exercise.locales),
    tags: exercise.tagIds,
  };
}

export function fromShared(
  definition: SharedMultipleChoiceTestExerciseDefinition,
): MultipleChoiceTestExercise {
  return {
    kind: "multiple-choice",
    correctOptionIndex: definition.correctOptionIndex,
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
    tagIds: definition.tags,
  };
}
