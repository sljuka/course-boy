import { describe, expect, it } from "vitest";

import {
  cycleWordTypeSelection,
  decodeWordTypeSelections,
  encodeWordTypeSelections,
  isValidWordTypeColor,
} from "@/lib/exercise-kinds/word-types";

describe("word-type selection encoding", () => {
  it("decodes an empty/invalid raw value to all-unanswered", () => {
    expect(decodeWordTypeSelections("", 3)).toEqual(["", "", ""]);
    expect(decodeWordTypeSelections("not json", 2)).toEqual(["", ""]);
  });

  it("rejects a decoded array of the wrong length", () => {
    expect(decodeWordTypeSelections(encodeWordTypeSelections(["n"]), 2)).toEqual(["", ""]);
  });

  it("round-trips a valid selection array", () => {
    const encoded = encodeWordTypeSelections(["n", "", "v"]);

    expect(decodeWordTypeSelections(encoded, 3)).toEqual(["n", "", "v"]);
  });

  it("cycles a word's selection through the defined types and back to unselected", () => {
    const wordTypeIds = ["wt_noun", "wt_verb"];
    const empty = encodeWordTypeSelections(["", ""]);

    const first = cycleWordTypeSelection(empty, 0, wordTypeIds, 2);
    expect(decodeWordTypeSelections(first, 2)).toEqual(["wt_noun", ""]);

    const second = cycleWordTypeSelection(first, 0, wordTypeIds, 2);
    expect(decodeWordTypeSelections(second, 2)).toEqual(["wt_verb", ""]);

    const third = cycleWordTypeSelection(second, 0, wordTypeIds, 2);
    expect(decodeWordTypeSelections(third, 2)).toEqual(["", ""]);
  });

  it("only advances the targeted word's selection", () => {
    const wordTypeIds = ["wt_noun", "wt_verb"];
    const initial = encodeWordTypeSelections(["wt_noun", ""]);

    const next = cycleWordTypeSelection(initial, 1, wordTypeIds, 2);

    expect(decodeWordTypeSelections(next, 2)).toEqual(["wt_noun", "wt_noun"]);
  });
});

describe("isValidWordTypeColor", () => {
  it("accepts a legacy named CourseTagColor", () => {
    expect(isValidWordTypeColor("sky")).toBe(true);
  });

  it("accepts a 3- or 6-digit hex color, case-insensitively", () => {
    expect(isValidWordTypeColor("#bae6fd")).toBe(true);
    expect(isValidWordTypeColor("#ABC")).toBe(true);
  });

  it("rejects a color that is neither a named color nor a hex string", () => {
    expect(isValidWordTypeColor("not-a-color")).toBe(false);
    expect(isValidWordTypeColor("bae6fd")).toBe(false);
    expect(isValidWordTypeColor(42)).toBe(false);
  });
});
