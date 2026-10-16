import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUNCTUATION_MARKS,
  comparePunctuation,
  decodePunctuationAnswer,
  joinPunctuationSentence,
  normalizeMarks,
  parsePunctuationText,
} from "@/lib/punctuation";

const marks = [...DEFAULT_PUNCTUATION_MARKS];

// SLJ-145: a sentence's words and the marks in the gaps around them.
describe("parsePunctuationText", () => {
  it("takes the marks out into the gaps, in order", () => {
    expect(parsePunctuationText("Učiteljica reče: „Sutra idemo u pozorište.“", marks)).toEqual({
      gaps: ["", "", ":„", "", "", "", ".“"],
      words: ["Učiteljica", "reče", "Sutra", "idemo", "u", "pozorište"],
    });
    expect(parsePunctuationText("„Doneću ti knjigu“, reče Stefan, „sutra u školu.“", marks).gaps).toEqual([
      "„",
      "",
      "",
      "“,",
      "",
      ",„",
      "",
      "",
      ".“",
    ]);
  });

  it("keeps marks inside a word and marks outside the set", () => {
    expect(parsePunctuationText("Pi je 3.14 (otprilike).", marks)).toEqual({
      gaps: ["", "", "", "", "."],
      words: ["Pi", "je", "3.14", "(otprilike)"],
    });
  });

  it("puts a dash standing alone into the gap between the words", () => {
    expect(parsePunctuationText("Ana – moja sestra – peva.", marks)).toEqual({
      gaps: ["", "–", "", "–", "."],
      words: ["Ana", "moja", "sestra", "peva"],
    });
  });
});

describe("joinPunctuationSentence", () => {
  it("writes the sentence back, spaced as written", () => {
    for (const text of [
      "Učiteljica reče: „Sutra idemo u pozorište.“",
      "„Doneću ti knjigu“, reče Stefan, „sutra u školu.“",
      "„Zašto si zakasnio?“ upita Mona Relju.",
      "Ana – moja sestra – peva.",
    ]) {
      const { gaps, words } = parsePunctuationText(text, marks);
      expect(joinPunctuationSentence(words, gaps)).toBe(text);
    }
  });

  it("writes it without marks too", () => {
    const { words } = parsePunctuationText("Ana reče: „Važi.“", marks);
    expect(joinPunctuationSentence(words, ["", "", "", ""])).toBe("Ana reče Važi");
  });
});

describe("comparePunctuation", () => {
  it("counts gaps right, extra marks, and which gaps are as they should be", () => {
    expect(comparePunctuation(["", ":„", ".“"], ["", ":„", "."])).toEqual({
      extra: 0,
      parts: [true, true, false],
      right: 1,
      total: 2,
    });
    expect(comparePunctuation(["", ":„", ".“"], [",", "„:", ".“"])).toEqual({
      extra: 1,
      parts: [false, false, true],
      right: 1,
      total: 2,
    });
  });
});

describe("answers and marks", () => {
  it("decodes an answer of the right length, else no marks", () => {
    expect(decodePunctuationAnswer('["", ":"]', 2)).toEqual(["", ":"]);
    expect(decodePunctuationAnswer('[":"]', 2)).toEqual(["", ""]);
    expect(decodePunctuationAnswer("", 3)).toEqual(["", "", ""]);
  });

  it("keeps single marks once, and falls back to the default set", () => {
    expect(normalizeMarks([":", ":", " ", "ab", "?"])).toEqual([":", "?"]);
    expect(normalizeMarks([])).toEqual(marks);
  });
});
