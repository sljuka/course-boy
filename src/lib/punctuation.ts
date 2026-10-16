// The punctuation exercise (SLJ-145): the teacher writes a sentence with its
// marks; the student sees it without them and places each mark in the gap
// where it belongs. Pure: used by the runtime (main and renderer) and the UI.
//
// A sentence is words and the gaps around them: gap 0 before the first word,
// gap i between word i-1 and word i, the last gap after the last word. Each
// gap holds the marks in it, in order ("“," after a quote). Only marks from
// the exercise's set are taken out; anything else stays part of a word, and
// so does a mark inside a word ("3.5", "e-mail").

export const DEFAULT_PUNCTUATION_MARKS = [":", "„", "“", ",", ".", "?", "!", ";", "–"] as const;

// Marks written before the word they belong to (after the space), and marks
// standing on their own between spaces; every other mark closes the word
// before it.
const OPENING_MARKS = new Set(["„", "(", "«", "‚"]);
const STANDALONE_MARKS = new Set(["–", "—"]);

export type PunctuationSentence = {
  // The marks in each gap, words.length + 1 of them.
  gaps: string[];
  words: string[];
};

// Each mark is one character (as typed on screen); duplicates and spaces go.
export function normalizeMarks(marks: readonly string[] | undefined): string[] {
  const source = marks && marks.length > 0 ? marks : DEFAULT_PUNCTUATION_MARKS;
  return [...new Set(source.map((mark) => mark.trim()).filter((mark) => [...mark].length === 1))];
}

export function parsePunctuationText(text: string, marks: readonly string[]): PunctuationSentence {
  const markSet = new Set(marks);
  const words: string[] = [];
  const gaps: string[] = [""];

  for (const chunk of text.split(/\s+/).filter(Boolean)) {
    const characters = [...chunk];
    let start = 0;
    let end = characters.length;
    while (start < end && markSet.has(characters[start])) start += 1;
    while (end > start && markSet.has(characters[end - 1])) end -= 1;
    const leading = characters.slice(0, start).join("");
    const trailing = characters.slice(end).join("");

    if (start === end) {
      // Marks alone (a dash between spaces): all in the current gap.
      gaps[gaps.length - 1] += leading;
      continue;
    }

    gaps[gaps.length - 1] += leading;
    words.push(characters.slice(start, end).join(""));
    gaps.push(trailing);
  }

  return { gaps, words };
}

// The sentence with these marks in its gaps, spaced as written: a closing
// mark against the word before, an opening one against the word after, a
// dash between spaces.
export function joinPunctuationSentence(words: readonly string[], gaps: readonly string[]): string {
  let result = "";

  for (let index = 0; index <= words.length; index += 1) {
    const marks = [...(gaps[index] ?? "")];
    const isFirst = index === 0;
    const isLast = index === words.length;
    let before = "";
    let after = "";
    let standalone = "";

    for (const mark of marks) {
      if (STANDALONE_MARKS.has(mark)) standalone += mark;
      else if (OPENING_MARKS.has(mark) || (isFirst && !isLast)) after += mark;
      else before += mark;
    }

    result += before;
    if (!isFirst && !isLast) result += " ";
    if (standalone) result += isFirst || isLast ? standalone : `${standalone} `;
    result += after;
    if (!isLast) result += words[index];
  }

  return result;
}

export function encodePunctuationAnswer(gaps: readonly string[]): string {
  return JSON.stringify(gaps);
}

export function decodePunctuationAnswer(raw: string, gapCount: number): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length === gapCount && parsed.every((gap) => typeof gap === "string")) {
      return parsed;
    }
  } catch {
    // An empty answer: no marks placed.
  }
  return Array.from({ length: gapCount }, () => "");
}

// How a placed answer compares, gap by gap. `right`: gaps that need marks
// and have exactly them; `extra`: gaps that need none but got some; `total`:
// gaps that need marks. `parts`: whether each gap is as it should be.
export function comparePunctuation(expected: readonly string[], given: readonly string[]) {
  let right = 0;
  let extra = 0;
  let total = 0;
  const parts = expected.map((marks, index) => {
    const placed = given[index] ?? "";
    if (marks) {
      total += 1;
      if (placed === marks) right += 1;
    } else if (placed) {
      extra += 1;
    }
    return placed === marks;
  });
  return { extra, parts, right, total };
}
