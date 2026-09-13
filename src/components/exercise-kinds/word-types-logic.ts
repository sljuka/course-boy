import type { SharedWordTypeTestExerciseDefinition, WordTypeDefinition } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { extractWordTypeSymbols } from "@/lib/word-type-markup";

import type {
  SolutionValidationResult,
  WordTypeDefinitionDraft,
  WordTypeTestExercise,
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
        prompt: "",
        text: "",
      },
    ]),
  );
}

// Mirrors the curated palette in `LIGHT_WORD_TYPE_COLOR_OPTIONS`
// (word-type-exercise-fields.tsx) — kept as literals here to avoid a UI-file
// import from this pure logic module. A new word type gets a random one of
// these so a test's types don't all start out looking the same.
const DEFAULT_WORD_TYPE_COLORS = [
  "#fecaca",
  "#fed7aa",
  "#fde68a",
  "#fef08a",
  "#d9f99d",
  "#bbf7d0",
  "#99f6e4",
  "#bae6fd",
  "#bfdbfe",
  "#e9d5ff",
  "#fbcfe8",
  "#e7e5e4",
];

function pickRandomDefaultColor(): string {
  return DEFAULT_WORD_TYPE_COLORS[Math.floor(Math.random() * DEFAULT_WORD_TYPE_COLORS.length)];
}

function createWordTypeDefinition(locales: Locale[]): WordTypeDefinitionDraft {
  return {
    color: pickRandomDefaultColor(),
    icon: "",
    id: createId("type"),
    names: Object.fromEntries(locales.map((locale) => [locale, ""])),
    symbol: "",
  };
}

export function createExercise(locales: Locale[]): WordTypeTestExercise {
  return {
    kind: "word-types",
    id: createId("ex"),
    locales: createExerciseLocaleMap(locales),
    tagIds: [],
    wordTypes: [createWordTypeDefinition(locales), createWordTypeDefinition(locales)],
  };
}

export function updatePrompt(
  exercise: WordTypeTestExercise,
  locale: Locale,
  prompt: string,
): WordTypeTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: {
        ...(exercise.locales[locale] ?? { hint: "", prompt: "", text: "" }),
        prompt,
      },
    },
  };
}

export function updateHint(
  exercise: WordTypeTestExercise,
  locale: Locale,
  hint: string,
): WordTypeTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: {
        ...(exercise.locales[locale] ?? { hint: "", prompt: "", text: "" }),
        hint,
      },
    },
  };
}

export function updateText(
  exercise: WordTypeTestExercise,
  locale: Locale,
  text: string,
): WordTypeTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: {
        ...(exercise.locales[locale] ?? { hint: "", prompt: "", text: "" }),
        text,
      },
    },
  };
}

// Word types are a structural, locale-independent array (like multiple-choice
// options) — a type's symbol/color/icon apply across every locale, only its
// display name is per-locale text.
export function addWordType(
  exercise: WordTypeTestExercise,
  locales: Locale[],
): WordTypeTestExercise {
  return {
    ...exercise,
    wordTypes: [...exercise.wordTypes, createWordTypeDefinition(locales)],
  };
}

export function removeWordType(
  exercise: WordTypeTestExercise,
  wordTypeId: string,
): WordTypeTestExercise {
  return {
    ...exercise,
    wordTypes: exercise.wordTypes.filter((wordType) => wordType.id !== wordTypeId),
  };
}

export function updateSymbol(
  exercise: WordTypeTestExercise,
  wordTypeId: string,
  symbol: string,
): WordTypeTestExercise {
  return {
    ...exercise,
    wordTypes: exercise.wordTypes.map((wordType) =>
      wordType.id === wordTypeId ? { ...wordType, symbol } : wordType,
    ),
  };
}

export function updateIcon(
  exercise: WordTypeTestExercise,
  wordTypeId: string,
  icon: string,
): WordTypeTestExercise {
  return {
    ...exercise,
    wordTypes: exercise.wordTypes.map((wordType) =>
      wordType.id === wordTypeId ? { ...wordType, icon } : wordType,
    ),
  };
}

export function updateColor(
  exercise: WordTypeTestExercise,
  wordTypeId: string,
  color: WordTypeDefinitionDraft["color"],
): WordTypeTestExercise {
  return {
    ...exercise,
    wordTypes: exercise.wordTypes.map((wordType) =>
      wordType.id === wordTypeId ? { ...wordType, color } : wordType,
    ),
  };
}

export function updateName(
  exercise: WordTypeTestExercise,
  wordTypeId: string,
  locale: Locale,
  name: string,
): WordTypeTestExercise {
  return {
    ...exercise,
    wordTypes: exercise.wordTypes.map((wordType) =>
      wordType.id === wordTypeId
        ? { ...wordType, names: { ...wordType.names, [locale]: name } }
        : wordType,
    ),
  };
}

export function validate(
  exercise: WordTypeTestExercise,
  locale: Locale,
): SolutionValidationResult {
  const content = exercise.locales[locale];

  if (!content || content.text.trim().length === 0) {
    return { status: "idle" };
  }

  const nonEmptyWordTypes = exercise.wordTypes.filter(
    (wordType) => wordType.symbol.trim().length > 0,
  );

  if (nonEmptyWordTypes.length === 0) {
    return { message: "Define at least one word type", status: "error" };
  }

  if (exercise.wordTypes.some((wordType) => wordType.symbol.trim().length !== 1)) {
    return { message: "Every type symbol must be a single character", status: "error" };
  }

  if (exercise.wordTypes.some((wordType) => !(wordType.names[locale] ?? "").trim())) {
    return { message: "Every type needs a name", status: "error" };
  }

  const uniqueSymbols = new Set(exercise.wordTypes.map((wordType) => wordType.symbol));

  if (uniqueSymbols.size !== exercise.wordTypes.length) {
    return { message: "Type symbols must be unique", status: "error" };
  }

  const referencedSymbols = extractWordTypeSymbols(content.text);

  if (referencedSymbols.length === 0) {
    return { message: "Mark at least one word with a {{symbol}}", status: "error" };
  }

  const definedSymbols = new Set(exercise.wordTypes.map((wordType) => wordType.symbol));
  const unknownSymbol = referencedSymbols.find((symbol) => !definedSymbols.has(symbol));

  if (unknownSymbol) {
    return { message: `Unknown type symbol "${unknownSymbol}"`, status: "error" };
  }

  return { message: "Looks good", status: "valid" };
}

export function toShared(
  exercise: WordTypeTestExercise,
): SharedWordTypeTestExerciseDefinition {
  return {
    kind: "word-types",
    locales: filterValidLocaleEntries(exercise.locales),
    tags: exercise.tagIds,
    wordTypes: exercise.wordTypes.map((wordType) => ({
      color: wordType.color,
      icon: wordType.icon,
      id: wordType.id,
      names: filterValidLocaleEntries(wordType.names),
      symbol: wordType.symbol,
    })),
  };
}

export function fromShared(
  definition: SharedWordTypeTestExerciseDefinition,
): WordTypeTestExercise {
  return {
    kind: "word-types",
    id: createId("ex"),
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [
        locale,
        {
          hint: content?.hint ?? "",
          prompt: content?.prompt ?? "",
          text: content?.text ?? "",
        },
      ]),
    ),
    tagIds: definition.tags,
    wordTypes: definition.wordTypes.map(
      (wordType: WordTypeDefinition): WordTypeDefinitionDraft => ({
        color: wordType.color,
        icon: wordType.icon,
        id: wordType.id,
        names: Object.fromEntries(
          Object.entries(wordType.names).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        ),
        symbol: wordType.symbol,
      }),
    ),
  };
}
