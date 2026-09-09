import { describe, expect, it } from "vitest";

import {
  extractMarkedWordTypeIds,
  extractWordTypeSymbols,
  parseWordTypeMarkup,
} from "@/lib/word-type-markup";

describe("parseWordTypeMarkup", () => {
  it("splits marked words from surrounding text", () => {
    const symbolToId = new Map([
      ["n", "wt_noun"],
      ["v", "wt_verb"],
    ]);

    const tokens = parseWordTypeMarkup("Mike{{n}} is jumping{{v}} today.", symbolToId);

    expect(tokens).toEqual([
      { kind: "word", value: "Mike", wordTypeId: "wt_noun" },
      { kind: "text", value: " is " },
      { kind: "word", value: "jumping", wordTypeId: "wt_verb" },
      { kind: "text", value: " today." },
    ]);
  });

  it("keeps punctuation directly after a marker as literal text", () => {
    const symbolToId = new Map([["n", "wt_noun"]]);

    const tokens = parseWordTypeMarkup("The fence{{n}}.", symbolToId);

    expect(tokens).toEqual([
      { kind: "text", value: "The " },
      { kind: "word", value: "fence", wordTypeId: "wt_noun" },
      { kind: "text", value: "." },
    ]);
  });

  it("leaves an unrecognized symbol's markup as literal text", () => {
    const tokens = parseWordTypeMarkup("Mike{{x}} runs.", new Map());

    expect(tokens).toEqual([{ kind: "text", value: "Mike{{x}} runs." }]);
  });

  it("returns a single text token for plain text with no markers", () => {
    const tokens = parseWordTypeMarkup("Nothing marked here.", new Map());

    expect(tokens).toEqual([{ kind: "text", value: "Nothing marked here." }]);
  });

  it("marks a parenthesized phrase of sequential words as a single word token", () => {
    const symbolToId = new Map([["n", "wt_noun"]]);

    const tokens = parseWordTypeMarkup("We got a (house-warming gift){{n}} today.", symbolToId);

    expect(tokens).toEqual([
      { kind: "text", value: "We got a " },
      { kind: "word", value: "house-warming gift", wordTypeId: "wt_noun" },
      { kind: "text", value: " today." },
    ]);
  });

  it("mixes single-word and phrase markers in the same text", () => {
    const symbolToId = new Map([
      ["n", "wt_noun"],
      ["v", "wt_verb"],
    ]);

    const tokens = parseWordTypeMarkup(
      "Mike{{n}} received a (house-warming gift){{n}} and smiled{{v}}.",
      symbolToId,
    );

    expect(tokens).toEqual([
      { kind: "word", value: "Mike", wordTypeId: "wt_noun" },
      { kind: "text", value: " received a " },
      { kind: "word", value: "house-warming gift", wordTypeId: "wt_noun" },
      { kind: "text", value: " and " },
      { kind: "word", value: "smiled", wordTypeId: "wt_verb" },
      { kind: "text", value: "." },
    ]);
  });

  it("leaves an unmarked parenthetical in ordinary prose as literal text", () => {
    const tokens = parseWordTypeMarkup("The dog (a golden retriever) ran.", new Map());

    expect(tokens).toEqual([{ kind: "text", value: "The dog (a golden retriever) ran." }]);
  });
});

describe("extractMarkedWordTypeIds", () => {
  it("returns one id per marked word, skipping text tokens entirely", () => {
    const symbolToId = new Map([
      ["n", "wt_noun"],
      ["v", "wt_verb"],
    ]);
    const tokens = parseWordTypeMarkup(
      "Mike{{n}} is jumping{{v}} on the tramboline{{n}}",
      symbolToId,
    );

    // Regression: a naive `tokens.map(t => t.kind === "word" ? t.wordTypeId : "")`
    // produces one entry per *token* (including blanks for "is"/"on the"),
    // which desyncs from a renderer that indexes by marked-word position only —
    // every word after the first text gap ends up rendered with the previous
    // word's type instead of its own.
    expect(extractMarkedWordTypeIds(tokens)).toEqual(["wt_noun", "wt_verb", "wt_noun"]);
  });

  it("returns an empty array when there are no marked words", () => {
    expect(extractMarkedWordTypeIds(parseWordTypeMarkup("Nothing marked.", new Map()))).toEqual(
      [],
    );
  });
});

describe("extractWordTypeSymbols", () => {
  it("collects the unique referenced symbols", () => {
    expect(
      extractWordTypeSymbols("Mike{{n}} is jumping{{v}} over the fence{{n}}."),
    ).toEqual(["n", "v"]);
  });

  it("returns an empty array when no markers are present", () => {
    expect(extractWordTypeSymbols("No markers here.")).toEqual([]);
  });

  it("collects symbols referenced by a parenthesized phrase marker", () => {
    expect(extractWordTypeSymbols("A (house-warming gift){{n}} arrived.")).toEqual(["n"]);
  });
});
