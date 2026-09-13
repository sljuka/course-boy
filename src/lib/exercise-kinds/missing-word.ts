import type {
  MissingWordCourseExercise,
  MissingWordSegment,
  MissingWordVariable,
  SharedMissingWordTestExerciseDefinition,
} from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isLocale } from "../i18n";
import { extractMissingWordVariableNames, parseMissingWordMarkup } from "../missing-word-markup";

import {
  hasValidTags,
  type ExerciseKindRuntime,
  type GradeResult,
  type ResolveForPlayerContext,
} from "./types";

export function encodeMissingWordAnswers(answers: string[]): string {
  return JSON.stringify(answers);
}

export function decodeMissingWordAnswers(raw: string, blankCount: number): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (
      Array.isArray(parsed) &&
      parsed.length === blankCount &&
      parsed.every((value) => typeof value === "string")
    ) {
      return parsed;
    }
  } catch {
    // fall through to the empty default below
  }

  return Array.from({ length: blankCount }, () => "");
}

function isValidVariable(variable: unknown): variable is MissingWordVariable {
  if (!variable || typeof variable !== "object") {
    return false;
  }

  const typedVariable = variable as Partial<MissingWordVariable>;

  return (
    typeof typedVariable.name === "string" &&
    typedVariable.name.length > 0 &&
    typeof typedVariable.matchCase === "boolean" &&
    Array.isArray(typedVariable.answers) &&
    typedVariable.answers.length > 0 &&
    typedVariable.answers.every((answer) => typeof answer === "string" && answer.length > 0)
  );
}

function isValid(
  exercise: Record<string, unknown>,
): exercise is SharedMissingWordTestExerciseDefinition {
  if (!hasValidTags(exercise)) {
    return false;
  }

  if (!exercise.locales || typeof exercise.locales !== "object") {
    return false;
  }

  const localeEntries = Object.entries(exercise.locales);

  if (localeEntries.length === 0) {
    return false;
  }

  return localeEntries.every(([locale, metadata]) => {
    if (!isLocale(locale) || !metadata || typeof metadata !== "object") {
      return false;
    }

    const typedMetadata = metadata as {
      hint?: unknown;
      prompt?: unknown;
      text?: unknown;
      variables?: unknown;
    };

    if (
      typeof typedMetadata.prompt !== "string" ||
      (typeof typedMetadata.hint !== "undefined" && typeof typedMetadata.hint !== "string") ||
      typeof typedMetadata.text !== "string" ||
      !Array.isArray(typedMetadata.variables) ||
      !typedMetadata.variables.every(isValidVariable)
    ) {
      return false;
    }

    if (typedMetadata.text.trim().length === 0) {
      return true;
    }

    const referencedNames = extractMissingWordVariableNames(typedMetadata.text);

    if (referencedNames.length === 0) {
      return false;
    }

    const definedNames = new Set(
      typedMetadata.variables.map((variable) => (variable as MissingWordVariable).name),
    );

    if (definedNames.size !== typedMetadata.variables.length) {
      return false;
    }

    return referencedNames.every((name) => definedNames.has(name));
  });
}

function resolveForPlayer(
  shared: SharedMissingWordTestExerciseDefinition,
  context: ResolveForPlayerContext,
): MissingWordCourseExercise {
  const localeKey = context.requestedLocales.find(
    (locale) => typeof shared.locales[locale]?.text === "string",
  );
  const localeContent = localeKey ? shared.locales[localeKey] : undefined;
  const text = localeContent?.text ?? "";

  return {
    hint: context.hint,
    id: context.id,
    kind: "missing-word",
    prompt: context.prompt,
    segments: parseMissingWordMarkup(text),
    tags: shared.tags,
    variables: localeContent?.variables ?? [],
  };
}

function buildInstance(): ExerciseInstance {
  return { kind: "missing-word" };
}

function normalizeForComparison(value: string, matchCase: boolean): string {
  const trimmed = value.trim();

  return matchCase ? trimmed : trimmed.toLocaleLowerCase();
}

function grade(
  exercise: MissingWordCourseExercise,
  _instance: ExerciseInstance,
  rawAnswer: string,
): GradeResult {
  const blankSegments = exercise.segments.filter(
    (segment): segment is Extract<MissingWordSegment, { kind: "blank" }> =>
      segment.kind === "blank",
  );
  const answers = decodeMissingWordAnswers(rawAnswer, blankSegments.length);

  if (answers.every((answer) => !answer.trim())) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.enterAnswer" };
  }

  const variablesByName = new Map(exercise.variables.map((variable) => [variable.name, variable]));

  const isFullyCorrect = blankSegments.every((segment, index) => {
    const variable = variablesByName.get(segment.variableName);

    if (!variable) {
      return false;
    }

    const typedAnswer = normalizeForComparison(answers[index] ?? "", variable.matchCase);

    return variable.answers.some(
      (accepted) => normalizeForComparison(accepted, variable.matchCase) === typedAnswer,
    );
  });

  if (isFullyCorrect) {
    return { isCorrect: true };
  }

  return { isAnswered: true, isCorrect: false };
}

export const missingWordExerciseRuntime: ExerciseKindRuntime<
  SharedMissingWordTestExerciseDefinition,
  MissingWordCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "missing-word",
  resolveForPlayer,
};
