import { describe, expect, it } from "vitest";

import { createMnemonicMatcher, findMnemonicProblems, parseMnemonics, type CourseMnemonic } from "./mnemonics";

const newbery: CourseMnemonic = { mnemonic: "John 📰🍓", term: "John Newbery" };

function tagged(matcher: ReturnType<typeof createMnemonicMatcher>, text: string) {
  return matcher
    .split(text)
    .filter((segment) => "mnemonic" in segment)
    .map((segment) => segment.text);
}

describe("createMnemonicMatcher", () => {
  it("tags whole words only, ignoring case", () => {
    const matcher = createMnemonicMatcher([{ mnemonic: "🍎", term: "apple" }]);

    expect(matcher.split("An Apple, not pineapple or apples.")).toEqual([
      { text: "An " },
      { mnemonic: "🍎", text: "Apple" },
      { text: ", not pineapple or apples." },
    ]);
  });

  it("only tags the first N places, across every text of the lesson", () => {
    const matcher = createMnemonicMatcher([{ ...newbery, showFirst: 2 }]);

    expect(tagged(matcher, "John Newbery wrote. John Newbery sold.")).toHaveLength(2);
    expect(tagged(matcher, "John Newbery again.")).toEqual([]);
  });

  it("defaults to the first 3", () => {
    const matcher = createMnemonicMatcher([newbery]);

    expect(tagged(matcher, "John Newbery ".repeat(5))).toHaveLength(3);
  });

  it("prefers the longest term where terms overlap", () => {
    const matcher = createMnemonicMatcher([
      { mnemonic: "🍓", term: "Newbery" },
      newbery,
    ]);

    expect(matcher.split("John Newbery")).toEqual([{ mnemonic: "John 📰🍓", text: "John Newbery" }]);
  });

  it("matches Serbian words with č/ć/š/ž and Cyrillic as whole words", () => {
    const matcher = createMnemonicMatcher([
      { aliases: ["Njuberija", "Njuberiju"], mnemonic: "📰🍓", term: "Njuberi" },
      { mnemonic: "🐻", term: "Медвед" },
    ]);

    expect(tagged(matcher, "Knjiga o Njuberiju i Njuberiji.")).toEqual(["Njuberiju"]);
    expect(tagged(matcher, "медвед и медведић")).toEqual(["медвед"]);
    expect(tagged(matcher, "Čašanjuberi")).toEqual([]);
  });

  it("counts aliases toward the same limit", () => {
    const matcher = createMnemonicMatcher([{ aliases: ["Njuberija"], mnemonic: "📰", showFirst: 1, term: "Njuberi" }]);

    expect(tagged(matcher, "Njuberija, Njuberi")).toEqual(["Njuberija"]);
  });

  it("tolerates different spacing inside a term", () => {
    const matcher = createMnemonicMatcher([newbery]);

    expect(tagged(matcher, "John  Newbery")).toEqual(["John  Newbery"]);
  });

  it("leaves text alone without mnemonics", () => {
    expect(createMnemonicMatcher([]).split("text")).toEqual([{ text: "text" }]);
  });
});

describe("findMnemonicProblems", () => {
  it("flags empty, duplicate and too-long rows", () => {
    expect(
      findMnemonicProblems([
        newbery,
        { mnemonic: "x", term: " " },
        { mnemonic: "y", term: "john newbery" },
        { mnemonic: "", term: "Other" },
        { mnemonic: "x".repeat(25), term: "Long" },
        { mnemonic: "👨‍👩‍👧".repeat(24), term: "Family" },
      ]),
    ).toEqual([null, "emptyTerm", "duplicateTerm", "emptyMnemonic", "mnemonicTooLong", null]);
  });

  it("treats an alias used by an earlier row as a duplicate", () => {
    expect(
      findMnemonicProblems([
        { aliases: ["Newbery"], mnemonic: "a", term: "John Newbery" },
        { mnemonic: "b", term: "newbery" },
      ]),
    ).toEqual([null, "duplicateTerm"]);
  });
});

describe("parseMnemonics", () => {
  it("keeps valid rows, trimmed, with showFirst only when not the default", () => {
    expect(
      parseMnemonics([
        { aliases: ["Newbery", "newbery", " ", "John Newbery"], mnemonic: " John 📰🍓 ", showFirst: 3, term: " John  Newbery " },
        { mnemonic: "🍎", showFirst: 500, term: "apple" },
        { mnemonic: "", term: "dropped" },
        "junk",
      ]),
    ).toEqual([
      { aliases: ["newbery"], mnemonic: "John 📰🍓", term: "John Newbery" },
      { mnemonic: "🍎", showFirst: 99, term: "apple" },
    ]);
  });

  it("reads anything else as no mnemonics", () => {
    expect(parseMnemonics(undefined)).toEqual([]);
    expect(parseMnemonics({})).toEqual([]);
  });
});
