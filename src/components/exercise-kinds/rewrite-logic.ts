import type { SharedRewriteTestExerciseDefinition } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";

import type {
  RewriteExerciseLocaleContent,
  RewriteTestExercise,
  SolutionValidationResult,
} from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyLocaleContent(): RewriteExerciseLocaleContent {
  return { hint: "", prompt: "", solutions: [""], source: "" };
}

export function createExercise(locales: Locale[]): RewriteTestExercise {
  return {
    acceptWithoutDiacritics: false,
    id: createId("ex"),
    kind: "rewrite",
    locales: Object.fromEntries(locales.map((locale) => [locale, emptyLocaleContent()])),
    matchCase: false,
    matchQuotes: false,
    tagIds: [],
  };
}

export function updateLocale(
  exercise: RewriteTestExercise,
  locale: Locale,
  change: Partial<RewriteExerciseLocaleContent>,
): RewriteTestExercise {
  return {
    ...exercise,
    locales: { ...exercise.locales, [locale]: { ...(exercise.locales[locale] ?? emptyLocaleContent()), ...change } },
  };
}

export function updateSolution(exercise: RewriteTestExercise, locale: Locale, index: number, value: string) {
  const solutions = exercise.locales[locale]?.solutions ?? [""];
  return updateLocale(exercise, locale, { solutions: solutions.map((solution, at) => (at === index ? value : solution)) });
}

export function addSolution(exercise: RewriteTestExercise, locale: Locale) {
  return updateLocale(exercise, locale, { solutions: [...(exercise.locales[locale]?.solutions ?? []), ""] });
}

// The last solution stays (emptied): an exercise always has a field for one.
export function removeSolution(exercise: RewriteTestExercise, locale: Locale, index: number) {
  const solutions = (exercise.locales[locale]?.solutions ?? []).filter((_, at) => at !== index);
  return updateLocale(exercise, locale, { solutions: solutions.length > 0 ? solutions : [""] });
}

const filledSolutions = (solutions: string[]) => solutions.map((solution) => solution.trim()).filter(Boolean);

export function validate(exercise: RewriteTestExercise, locale: Locale): SolutionValidationResult {
  const content = exercise.locales[locale];
  if (!content || (!content.prompt.trim() && filledSolutions(content.solutions).length === 0)) return { status: "idle" };
  if (filledSolutions(content.solutions).length === 0) {
    return { message: "Write at least one correct answer", status: "error" };
  }
  return { message: "Looks good", status: "valid" };
}

export function toShared(exercise: RewriteTestExercise): SharedRewriteTestExerciseDefinition {
  return {
    ...(exercise.acceptWithoutDiacritics ? { acceptWithoutDiacritics: true } : {}),
    kind: "rewrite",
    locales: filterValidLocaleEntries(
      Object.fromEntries(
        Object.entries(exercise.locales).map(([locale, content]) => [
          locale,
          {
            hint: content.hint,
            prompt: content.prompt,
            solutions: filledSolutions(content.solutions),
            ...(content.source.trim() ? { source: content.source } : {}),
          },
        ]),
      ),
    ),
    ...(exercise.matchCase ? { matchCase: true } : {}),
    ...(exercise.matchQuotes ? { matchQuotes: true } : {}),
    tags: exercise.tagIds,
  };
}

export function fromShared(definition: SharedRewriteTestExerciseDefinition): RewriteTestExercise {
  return {
    acceptWithoutDiacritics: definition.acceptWithoutDiacritics === true,
    id: createId("ex"),
    kind: "rewrite",
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [
        locale,
        {
          hint: content?.hint ?? "",
          prompt: content?.prompt ?? "",
          solutions: content?.solutions.length ? content.solutions : [""],
          source: content?.source ?? "",
        },
      ]),
    ),
    matchCase: definition.matchCase === true,
    matchQuotes: definition.matchQuotes === true,
    tagIds: definition.tags,
  };
}
