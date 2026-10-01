import { transliterateSerbianCyrillicToLatin } from "./course-slug";
import type { Locale } from "./i18n";
import { transliterateSerbianLatinToCyrillic } from "./serbian-transliteration";

// SLJ-17: a course can be written in one Serbian script and have the other
// generated. Stored in `course.json` as `serbianScript` (see docs/contracts.md
// §5); a missing field means both scripts are written by hand. Used by the
// main process on every save (so both scripts are always on disk, and a cut
// version or shared course needs no generator) and by the editor to know
// which language tab is generated.

export type SerbianLocale = "sr" | "sr-Cyrl";

export type SerbianScriptSetting = {
  // The script the teacher writes; the other one is generated from it.
  source: SerbianLocale;
  // Words never transliterated (foreign names, brands), matched whole and
  // case-insensitively. Words with q, w, x or y are already left alone.
  keepAsIs?: string[];
};

export function isSerbianLocale(locale: string): locale is SerbianLocale {
  return locale === "sr" || locale === "sr-Cyrl";
}

export function otherSerbianLocale(locale: SerbianLocale): SerbianLocale {
  return locale === "sr" ? "sr-Cyrl" : "sr";
}

export function isSerbianScriptSetting(value: unknown): value is SerbianScriptSetting {
  if (!value || typeof value !== "object") {
    return false;
  }

  const setting = value as Partial<SerbianScriptSetting>;

  return (
    typeof setting.source === "string" &&
    isSerbianLocale(setting.source) &&
    (setting.keepAsIs === undefined ||
      (Array.isArray(setting.keepAsIs) &&
        setting.keepAsIs.every((word) => typeof word === "string")))
  );
}

// The locale generated from the other one, or null when both are hand-written.
export function getGeneratedSerbianLocale(
  setting: SerbianScriptSetting | null | undefined,
): SerbianLocale | null {
  return setting ? otherSerbianLocale(setting.source) : null;
}

// Latin spellings where a digraph is really two letters ("nadživeti" is
// над+живети, not наџивети). Each entry splits a word that starts with it,
// lowercase, at "|"; both halves are then transliterated on their own.
const LATIN_DIGRAPH_EXCEPTIONS = [
  "nad|živ",
  "pod|žanr",
  "pod|žup",
  "kon|jug",
  "kon|junk",
  "in|jek",
  "van|jezi",
  "tan|jug",
  "an|jon",
].map((entry) => {
  const [head, tail] = entry.split("|");

  return { head, prefix: head + tail };
});

// Anything that isn't prose, kept exactly as written: inline code, {{…}}
// placeholders (numeric variables, missing-word blanks, word-type symbols),
// markdown link targets, <autolinks>, URLs, e-mail addresses, file names.
const PROTECTED_PATTERN = new RegExp(
  [
    "`[^`\\n]*`",
    "\\{\\{[^{}]*\\}\\}",
    "\\]\\([^)\\n]*\\)",
    "<[^<>\\s]+>",
    "(?:https?:\\/\\/|www\\.)[^\\s<>()\\[\\]]+",
    "[\\w.+-]+@[\\w-]+\\.[\\w.-]+",
    "[\\w-]+\\.(?:svg|png|jpe?g|gif|webp|avif|mp3|wav|ogg|m4a|mp4|webm|mov|pdf)\\b",
  ].join("|"),
  "giu",
);

const WORD_PATTERN = /[\p{L}\p{M}]+/gu;
const FOREIGN_LATIN_LETTER = /[qwxy]/i;

type TransliterateOptions = { keepAsIs?: string[] };

function transliterateWord(word: string, from: SerbianLocale, keep: Set<string>): string {
  const lower = word.toLowerCase();

  if (keep.has(lower)) {
    return word;
  }

  if (from === "sr-Cyrl") {
    const latin = transliterateSerbianCyrillicToLatin(word);

    // "ЉУБАВ" is "LJUBAV", not "LjUBAV".
    return word.length > 1 && word === word.toUpperCase() ? latin.toUpperCase() : latin;
  }

  if (FOREIGN_LATIN_LETTER.test(word)) {
    return word;
  }

  const exception = LATIN_DIGRAPH_EXCEPTIONS.find(({ prefix }) => lower.startsWith(prefix));

  if (exception) {
    return (
      transliterateSerbianLatinToCyrillic(word.slice(0, exception.head.length)) +
      transliterateSerbianLatinToCyrillic(word.slice(exception.head.length))
    );
  }

  return transliterateSerbianLatinToCyrillic(word);
}

function transliterateProse(text: string, from: SerbianLocale, keep: Set<string>): string {
  return text.replace(WORD_PATTERN, (word) => transliterateWord(word, from, keep));
}

function toKeepSet(options: TransliterateOptions): Set<string> {
  return new Set((options.keepAsIs ?? []).map((word) => word.trim().toLowerCase()).filter(Boolean));
}

/** One text field (a title, prompt, option…): prose only, markup kept. */
export function transliterateSerbianText(
  text: string,
  from: SerbianLocale,
  options: TransliterateOptions = {},
): string {
  const keep = toKeepSet(options);
  let result = "";
  let lastIndex = 0;

  for (const match of text.matchAll(PROTECTED_PATTERN)) {
    const index = match.index ?? 0;

    result += transliterateProse(text.slice(lastIndex, index), from, keep) + match[0];
    lastIndex = index + match[0].length;
  }

  return result + transliterateProse(text.slice(lastIndex), from, keep);
}

const BLOCK_MARKER_PATTERN = /^\[matko-block\]: <> \((\w+)\)$/;
const CODE_FENCE_PATTERN = /^\s*(```|~~~)/;

/**
 * A lesson body (`locales/<lang>/lesson-….md`). Like `transliterateSerbianText`
 * per line, but also keeps block markers and fenced code as they are, and
 * fills an embedded exercise block's JSON with its generated locale.
 */
export function transliterateSerbianMarkdown(
  markdown: string,
  setting: SerbianScriptSetting,
): string {
  const lines = markdown.split("\n");
  const output: string[] = [];
  let inFence = false;
  let inExerciseBlock = false;

  for (const line of lines) {
    const marker = line.match(BLOCK_MARKER_PATTERN);

    if (marker) {
      inExerciseBlock = marker[1] === "exercise";
      inFence = false;
      output.push(line);
      continue;
    }

    if (inExerciseBlock && line.trim().startsWith("{")) {
      output.push(transliterateExerciseJsonLine(line, setting));
      continue;
    }

    if (CODE_FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    output.push(
      inFence ? line : transliterateSerbianText(line, setting.source, { keepAsIs: setting.keepAsIs }),
    );
  }

  return output.join("\n");
}

function transliterateExerciseJsonLine(line: string, setting: SerbianScriptSetting): string {
  try {
    return JSON.stringify(syncSerbianLocales(JSON.parse(line) as unknown, setting));
  } catch {
    // Not valid JSON: leave it exactly as it is rather than guess.
    return line;
  }
}

// Keys inside a localized value that name things rather than say them.
const NON_PROSE_KEYS = new Set(["id", "name", "variableName", "symbol", "icon", "color"]);

function transliterateValue(value: unknown, setting: SerbianScriptSetting): unknown {
  if (typeof value === "string") {
    return transliterateSerbianText(value, setting.source, { keepAsIs: setting.keepAsIs });
  }

  if (Array.isArray(value)) {
    return value.map((item) => transliterateValue(item, setting));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        NON_PROSE_KEYS.has(key) ? nested : transliterateValue(nested, setting),
      ]),
    );
  }

  return value;
}

const LOCALE_KEYS = new Set<string>(["en", "sr", "sr-Cyrl"] satisfies Locale[]);

function isLocalizedMap(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);

  return keys.length > 0 && keys.every((key) => LOCALE_KEYS.has(key));
}

/**
 * Fills the generated Serbian locale everywhere in a course file's JSON: every
 * per-locale map (`locales`, a word type's `names`, a region's `labels` or
 * `answers`, …) gets the generated locale from the source one. Maps without
 * the source locale are left alone. Returns a new value.
 */
export function syncSerbianLocales<T>(value: T, setting: SerbianScriptSetting | null | undefined): T {
  if (!setting) {
    return value;
  }

  const target = otherSerbianLocale(setting.source);

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(walk);
    }

    if (!node || typeof node !== "object") {
      return node;
    }

    const record = node as Record<string, unknown>;

    if (isLocalizedMap(record)) {
      const synced = Object.fromEntries(Object.entries(record).map(([key, nested]) => [key, walk(nested)]));

      if (setting.source in record) {
        synced[target] = transliterateValue(record[setting.source], setting);
      }

      return synced;
    }

    return Object.fromEntries(Object.entries(record).map(([key, nested]) => [key, walk(nested)]));
  };

  return walk(value) as T;
}

/**
 * Which script existing Serbian text is mostly written in, by letter count —
 * used once, to suggest a source when a teacher turns generation on. Null when
 * there are no Serbian letters to go by.
 */
export function detectSerbianScript(texts: string[]): SerbianLocale | null {
  let cyrillic = 0;
  let latin = 0;

  for (const text of texts) {
    cyrillic += text.match(/\p{Script=Cyrillic}/gu)?.length ?? 0;
    latin += text.match(/\p{Script=Latin}/gu)?.length ?? 0;
  }

  if (cyrillic === 0 && latin === 0) {
    return null;
  }

  return cyrillic > latin ? "sr-Cyrl" : "sr";
}
