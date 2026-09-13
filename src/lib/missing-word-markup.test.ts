import { describe, expect, it } from "vitest";

import { extractMissingWordVariableNames, parseMissingWordMarkup } from "@/lib/missing-word-markup";

describe("parseMissingWordMarkup", () => {
  it("splits a single blank from surrounding text", () => {
    expect(parseMissingWordMarkup("The capital of France is {{c1}}.")).toEqual([
      { kind: "text", value: "The capital of France is " },
      { kind: "blank", variableName: "c1" },
      { kind: "text", value: "." },
    ]);
  });

  it("supports multiple differently-named blanks", () => {
    expect(
      parseMissingWordMarkup("The capital of France is {{c1}}. Capital of Serbia is {{c2}}."),
    ).toEqual([
      { kind: "text", value: "The capital of France is " },
      { kind: "blank", variableName: "c1" },
      { kind: "text", value: ". Capital of Serbia is " },
      { kind: "blank", variableName: "c2" },
      { kind: "text", value: "." },
    ]);
  });

  it("keeps each occurrence of a repeated variable name as its own blank segment", () => {
    expect(parseMissingWordMarkup("{{x}} equals {{x}}.")).toEqual([
      { kind: "blank", variableName: "x" },
      { kind: "text", value: " equals " },
      { kind: "blank", variableName: "x" },
      { kind: "text", value: "." },
    ]);
  });

  it("returns a single text segment when there is no blank", () => {
    expect(parseMissingWordMarkup("Nothing missing here.")).toEqual([
      { kind: "text", value: "Nothing missing here." },
    ]);
  });
});

describe("extractMissingWordVariableNames", () => {
  it("collects unique names in first-appearance order", () => {
    expect(extractMissingWordVariableNames("{{c2}} then {{c1}} then {{c2}} again")).toEqual([
      "c2",
      "c1",
    ]);
  });

  it("returns an empty array when there are no variables", () => {
    expect(extractMissingWordVariableNames("Nothing here.")).toEqual([]);
  });
});
