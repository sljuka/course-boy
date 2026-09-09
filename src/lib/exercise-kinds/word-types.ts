import type {
  SharedWordTypeTestExerciseDefinition,
  WordTypeCourseExercise,
} from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isCourseTagColor } from "../course-tags";
import { isLocale } from "../i18n";
import {
  extractMarkedWordTypeIds,
  extractWordTypeSymbols,
  parseWordTypeMarkup,
} from "../word-type-markup";

import {
  hasValidTags,
  type ExerciseKindRuntime,
  type GradeResult,
  type ResolveForPlayerContext,
} from "./types";

/** Icon is a free-text, optional field — capped so it can't become a smuggled string. */
export const MAX_WORD_TYPE_ICON_LENGTH = 8;

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * A word type's color is either one of the original named `CourseTagColor`s
 * (courses saved before the custom color picker existed) or an arbitrary
 * hex string from it. Accepting both means no migration is needed for
 * existing course data.
 */
export function isValidWordTypeColor(value: unknown): value is string {
  return typeof value === "string" && (isCourseTagColor(value) || HEX_COLOR_PATTERN.test(value));
}

function isValid(
  exercise: Record<string, unknown>,
): exercise is SharedWordTypeTestExerciseDefinition {
  if (!hasValidTags(exercise)) {
    return false;
  }

  if (!Array.isArray(exercise.wordTypes) || exercise.wordTypes.length === 0) {
    return false;
  }

  const symbols = new Set<string>();

  for (const wordType of exercise.wordTypes) {
    if (!wordType || typeof wordType !== "object") {
      return false;
    }

    const typedWordType = wordType as {
      color?: unknown;
      icon?: unknown;
      id?: unknown;
      names?: unknown;
      symbol?: unknown;
    };

    if (
      typeof typedWordType.id !== "string" ||
      typeof typedWordType.symbol !== "string" ||
      typedWordType.symbol.length !== 1 ||
      typeof typedWordType.icon !== "string" ||
      typedWordType.icon.length > MAX_WORD_TYPE_ICON_LENGTH ||
      !isValidWordTypeColor(typedWordType.color) ||
      !typedWordType.names ||
      typeof typedWordType.names !== "object" ||
      !Object.entries(typedWordType.names).every(
        ([locale, name]) => isLocale(locale) && typeof name === "string",
      )
    ) {
      return false;
    }

    if (symbols.has(typedWordType.symbol)) {
      return false;
    }

    symbols.add(typedWordType.symbol);
  }

  if (
    !exercise.locales ||
    typeof exercise.locales !== "object" ||
    !Object.entries(exercise.locales).every(([locale, metadata]) => {
      if (!isLocale(locale) || !metadata || typeof metadata !== "object") {
        return false;
      }

      const typedMetadata = metadata as { hint?: unknown; prompt?: unknown; text?: unknown };

      if (
        typeof typedMetadata.prompt !== "string" ||
        (typeof typedMetadata.hint !== "undefined" &&
          typeof typedMetadata.hint !== "string") ||
        typeof typedMetadata.text !== "string"
      ) {
        return false;
      }

      if (typedMetadata.text.trim().length === 0) {
        return true;
      }

      return extractWordTypeSymbols(typedMetadata.text).every((symbol) =>
        symbols.has(symbol),
      );
    })
  ) {
    return false;
  }

  return true;
}

function resolveForPlayer(
  shared: SharedWordTypeTestExerciseDefinition,
  context: ResolveForPlayerContext,
): WordTypeCourseExercise {
  const text =
    context.requestedLocales
      .map((locale) => shared.locales[locale]?.text)
      .find((textCandidate) => typeof textCandidate === "string") ?? "";
  const symbolToId = new Map(
    shared.wordTypes.map((wordType) => [wordType.symbol, wordType.id]),
  );

  return {
    hint: context.hint,
    id: context.id,
    kind: "word-types",
    prompt: context.prompt,
    tags: shared.tags,
    tokens: parseWordTypeMarkup(text, symbolToId),
    wordTypes: shared.wordTypes.map((wordType) => ({
      color: wordType.color,
      icon: wordType.icon,
      id: wordType.id,
      name:
        context.requestedLocales
          .map((locale) => wordType.names[locale])
          .find((nameCandidate) => typeof nameCandidate === "string") ?? "",
      symbol: wordType.symbol,
    })),
  };
}

function buildInstance(): ExerciseInstance {
  return { kind: "word-types" };
}

export function encodeWordTypeSelections(selections: string[]): string {
  return JSON.stringify(selections);
}

export function decodeWordTypeSelections(raw: string, markedWordCount: number): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (
      Array.isArray(parsed) &&
      parsed.length === markedWordCount &&
      parsed.every((value) => typeof value === "string")
    ) {
      return parsed;
    }
  } catch {
    // fall through to the empty default below
  }

  return Array.from({ length: markedWordCount }, () => "");
}

export function cycleWordTypeSelection(
  currentRaw: string,
  markedWordIndex: number,
  wordTypeIds: string[],
  markedWordCount: number,
): string {
  const selections = decodeWordTypeSelections(currentRaw, markedWordCount);
  const currentSelection = selections[markedWordIndex] ?? "";
  const currentTypeIndex = wordTypeIds.indexOf(currentSelection);
  const nextTypeIndex = currentTypeIndex + 1;
  const nextSelection = nextTypeIndex < wordTypeIds.length ? wordTypeIds[nextTypeIndex] : "";

  return encodeWordTypeSelections(
    selections.map((selection, index) =>
      index === markedWordIndex ? nextSelection : selection,
    ),
  );
}

function grade(
  exercise: WordTypeCourseExercise,
  _instance: ExerciseInstance,
  rawAnswer: string,
): GradeResult {
  const correctWordTypeIds = extractMarkedWordTypeIds(exercise.tokens);
  const selections = decodeWordTypeSelections(rawAnswer, correctWordTypeIds.length);

  if (selections.every((selection) => !selection)) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.markAllWords" };
  }

  const isFullyCorrect = correctWordTypeIds.every(
    (wordTypeId, tokenIndex) => selections[tokenIndex] === wordTypeId,
  );

  if (isFullyCorrect) {
    return { isCorrect: true };
  }

  return { isAnswered: true, isCorrect: false };
}

export const wordTypesExerciseRuntime: ExerciseKindRuntime<
  SharedWordTypeTestExerciseDefinition,
  WordTypeCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "word-types",
  resolveForPlayer,
};
