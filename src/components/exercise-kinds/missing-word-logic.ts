import type { SharedMissingWordTestExerciseDefinition } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { extractMissingWordVariableNames } from "@/lib/missing-word-markup";

import type {
  MissingWordExerciseLocaleContent,
  MissingWordTestExercise,
  MissingWordVariableDraft,
  SolutionValidationResult,
} from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyLocaleContent(): MissingWordExerciseLocaleContent {
  return { hint: "", prompt: "", text: "", variables: [] };
}

function createExerciseLocaleMap(locales: Locale[]) {
  return Object.fromEntries(locales.map((locale) => [locale, emptyLocaleContent()]));
}

export function createExercise(locales: Locale[]): MissingWordTestExercise {
  return {
    kind: "missing-word",
    id: createId("ex"),
    locales: createExerciseLocaleMap(locales),
    tagIds: [],
  };
}

/**
 * Variables are derived from the text, not added by hand: a `{{name}}`
 * appearing in the text gets a row below it, and removing every occurrence
 * of a name removes its row. A name's existing answers/matchCase survive as
 * long as the name still appears somewhere in the text.
 */
function syncVariablesWithText(
  text: string,
  currentVariables: MissingWordVariableDraft[],
): MissingWordVariableDraft[] {
  const existingByName = new Map(currentVariables.map((variable) => [variable.name, variable]));

  return extractMissingWordVariableNames(text).map(
    (name) => existingByName.get(name) ?? { answers: "", matchCase: true, name },
  );
}

export function updatePrompt(
  exercise: MissingWordTestExercise,
  locale: Locale,
  prompt: string,
): MissingWordTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: { ...(exercise.locales[locale] ?? emptyLocaleContent()), prompt },
    },
  };
}

export function updateText(
  exercise: MissingWordTestExercise,
  locale: Locale,
  text: string,
): MissingWordTestExercise {
  const content = exercise.locales[locale] ?? emptyLocaleContent();

  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: { ...content, text, variables: syncVariablesWithText(text, content.variables) },
    },
  };
}

export function updateVariableAnswers(
  exercise: MissingWordTestExercise,
  locale: Locale,
  name: string,
  answers: string,
): MissingWordTestExercise {
  const content = exercise.locales[locale] ?? emptyLocaleContent();

  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: {
        ...content,
        variables: content.variables.map((variable) =>
          variable.name === name ? { ...variable, answers } : variable,
        ),
      },
    },
  };
}

export function updateVariableMatchCase(
  exercise: MissingWordTestExercise,
  locale: Locale,
  name: string,
  matchCase: boolean,
): MissingWordTestExercise {
  const content = exercise.locales[locale] ?? emptyLocaleContent();

  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: {
        ...content,
        variables: content.variables.map((variable) =>
          variable.name === name ? { ...variable, matchCase } : variable,
        ),
      },
    },
  };
}

function parseAnswers(raw: string): string[] {
  return raw
    .split(",")
    .map((answer) => answer.trim())
    .filter((answer) => answer.length > 0);
}

export function validate(
  exercise: MissingWordTestExercise,
  locale: Locale,
): SolutionValidationResult {
  const content = exercise.locales[locale];

  if (!content || content.text.trim().length === 0) {
    return { status: "idle" };
  }

  if (content.variables.length === 0) {
    return { message: "Mark a missing word with {{name}}", status: "error" };
  }

  const emptyVariable = content.variables.find((variable) => parseAnswers(variable.answers).length === 0);

  if (emptyVariable) {
    return { message: `Enter an answer for {{${emptyVariable.name}}}`, status: "error" };
  }

  return { message: "Looks good", status: "valid" };
}

export function toShared(
  exercise: MissingWordTestExercise,
): SharedMissingWordTestExerciseDefinition {
  return {
    kind: "missing-word",
    locales: filterValidLocaleEntries(
      Object.fromEntries(
        Object.entries(exercise.locales).map(([locale, content]) => [
          locale,
          {
            hint: content.hint,
            prompt: content.prompt,
            text: content.text,
            variables: content.variables.map((variable) => ({
              answers: parseAnswers(variable.answers),
              matchCase: variable.matchCase,
              name: variable.name,
            })),
          },
        ]),
      ),
    ),
    tags: exercise.tagIds,
  };
}

export function fromShared(
  definition: SharedMissingWordTestExerciseDefinition,
): MissingWordTestExercise {
  return {
    kind: "missing-word",
    id: createId("ex"),
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [
        locale,
        {
          hint: content?.hint ?? "",
          prompt: content?.prompt ?? "",
          text: content?.text ?? "",
          variables: (content?.variables ?? []).map((variable) => ({
            answers: variable.answers.join(", "),
            matchCase: variable.matchCase,
            name: variable.name,
          })),
        },
      ]),
    ),
    tagIds: definition.tags,
  };
}
