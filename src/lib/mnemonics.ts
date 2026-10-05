// Course mnemonics (SLJ-37): a teacher defines a memory aid once per course
// and language — term "John Newbery", mnemonic "John 📰🍓" — and the player
// marks the first few places the term appears (dotted underline, the mnemonic
// in a tooltip). Lesson text is never changed; the mark exists only on screen.
//
// Stored in `course.json` as `locales[locale].mnemonics` (see
// docs/contracts.md). Kept free of React so the main process can validate
// what the renderer sends with the same rules.

import { countCharacters } from "./section-summary";

export type CourseMnemonic = {
  // Other forms of the term that count as the same (Serbian cases:
  // "Njuberija", "Njuberiju"…). Optional.
  aliases?: string[];
  // What's shown: text and emoji, up to MNEMONIC_MAX_LENGTH characters.
  mnemonic: string;
  // Tag only the first N places the term appears in a lesson; missing = 3.
  showFirst?: number;
  term: string;
};

export const MNEMONIC_MAX_LENGTH = 24;
export const MNEMONIC_TERM_MAX_LENGTH = 80;
export const DEFAULT_MNEMONIC_SHOW_FIRST = 3;
export const MNEMONIC_SHOW_FIRST_MAX = 99;
const MAX_ALIASES = 20;
const MAX_MNEMONICS = 200;

function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ");
}

function termKey(term: string): string {
  return normalizeTerm(term).toLocaleLowerCase();
}

export type MnemonicProblem = "emptyTerm" | "duplicateTerm" | "emptyMnemonic" | "mnemonicTooLong" | "termTooLong";

// What's wrong with each row, for the editor (in row order; null = fine).
// A term is a duplicate when it (or one of its aliases) is already used by an
// earlier row.
export function findMnemonicProblems(mnemonics: CourseMnemonic[]): (MnemonicProblem | null)[] {
  const seen = new Set<string>();

  return mnemonics.map((entry) => {
    const term = normalizeTerm(entry.term);
    const forms = [term, ...(entry.aliases ?? []).map(normalizeTerm)].filter(Boolean).map(termKey);
    const isDuplicate = forms.some((form) => seen.has(form));
    forms.forEach((form) => seen.add(form));

    if (!term) return "emptyTerm";
    if (countCharacters(term) > MNEMONIC_TERM_MAX_LENGTH) return "termTooLong";
    if (isDuplicate) return "duplicateTerm";
    if (!entry.mnemonic.trim()) return "emptyMnemonic";
    if (countCharacters(entry.mnemonic.trim()) > MNEMONIC_MAX_LENGTH) return "mnemonicTooLong";
    return null;
  });
}

// What gets stored: valid rows only, trimmed, aliases de-duplicated, and
// `showFirst` only when it isn't the default. Anything else (rows still being
// typed, values from a hand-edited or newer file) is dropped. Used by the main
// process on save and by the player on read.
export function parseMnemonics(value: unknown): CourseMnemonic[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const candidates = value
    .slice(0, MAX_MNEMONICS)
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => {
      const term = typeof entry.term === "string" ? normalizeTerm(entry.term) : "";
      const aliases = Array.isArray(entry.aliases)
        ? [
            ...new Map(
              entry.aliases
                .filter((alias): alias is string => typeof alias === "string")
                .map(normalizeTerm)
                .filter((alias) => alias && termKey(alias) !== termKey(term))
                .map((alias) => [termKey(alias), alias] as const),
            ).values(),
          ].slice(0, MAX_ALIASES)
        : [];
      const showFirst =
        typeof entry.showFirst === "number" && Number.isInteger(entry.showFirst)
          ? Math.min(MNEMONIC_SHOW_FIRST_MAX, Math.max(1, entry.showFirst))
          : DEFAULT_MNEMONIC_SHOW_FIRST;

      return {
        ...(aliases.length > 0 ? { aliases } : {}),
        mnemonic: typeof entry.mnemonic === "string" ? entry.mnemonic.trim() : "",
        ...(showFirst !== DEFAULT_MNEMONIC_SHOW_FIRST ? { showFirst } : {}),
        term,
      } satisfies CourseMnemonic;
    });
  const problems = findMnemonicProblems(candidates);

  return candidates.filter((_entry, index) => problems[index] === null);
}

export type MnemonicSegment = { text: string } | { mnemonic: string; text: string };

const WORD_CHARACTER = "[\\p{L}\\p{M}\\p{N}_]";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Splits text into plain runs and matched terms, for one lesson (or one test)
// at a time: it remembers how many times each mnemonic was shown, so only the
// first `showFirst` places are marked — across every text it's given, in
// order. Matching is whole-word and case-insensitive in any script (Latin
// with č/ć/š/ž, Cyrillic); where terms overlap the longest one wins
// ("John Newbery" over "Newbery"). A term split by formatting (half of it
// bold) isn't found.
export function createMnemonicMatcher(mnemonics: CourseMnemonic[]) {
  const forms = mnemonics
    .flatMap((entry, index) =>
      [entry.term, ...(entry.aliases ?? [])].map((form) => ({ form: normalizeTerm(form), index })),
    )
    .filter(({ form }) => form.length > 0)
    .sort((left, right) => right.form.length - left.form.length);
  const indexByForm = new Map(forms.map(({ form, index }) => [termKey(form), index]));
  const shown = mnemonics.map(() => 0);
  const pattern =
    forms.length === 0
      ? null
      : new RegExp(
          `(?<!${WORD_CHARACTER})(?:${forms
            .map(({ form }) => escapeRegExp(form).replace(/ /g, "\\s+"))
            .join("|")})(?!${WORD_CHARACTER})`,
          "giu",
        );

  return {
    split(text: string): MnemonicSegment[] {
      if (!pattern || !text) {
        return [{ text }];
      }

      const segments: MnemonicSegment[] = [];
      let last = 0;

      for (const match of text.matchAll(pattern)) {
        const index = indexByForm.get(termKey(match[0]));
        const entry = index === undefined ? undefined : mnemonics[index];

        if (index === undefined || !entry || shown[index] >= (entry.showFirst ?? DEFAULT_MNEMONIC_SHOW_FIRST)) {
          continue;
        }

        shown[index] += 1;
        const start = match.index ?? 0;
        if (start > last) segments.push({ text: text.slice(last, start) });
        segments.push({ mnemonic: entry.mnemonic, text: match[0] });
        last = start + match[0].length;
      }

      if (last < text.length) segments.push({ text: text.slice(last) });
      return segments.length > 0 ? segments : [{ text }];
    },
  };
}
