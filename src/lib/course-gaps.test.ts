import { describe, expect, it } from "vitest";

import { promptGaps, titleGaps, writtenLocales } from "./course-gaps";

describe("course gaps", () => {
  it("leaves out the generated Serbian script", () => {
    expect(writtenLocales(["en", "sr", "sr-Cyrl"], { source: "sr" })).toEqual(["en", "sr"]);
    expect(writtenLocales(["en", "sr", "sr-Cyrl"], null)).toEqual(["en", "sr", "sr-Cyrl"]);
  });

  it("finds titles missing or blank in a written language", () => {
    expect(titleGaps({ en: { title: "Fractions" }, sr: { title: "  " } }, ["en", "sr"])).toEqual([
      { field: "title", locale: "sr" },
    ]);
    expect(titleGaps(undefined, ["en"])).toEqual([{ field: "title", locale: "en" }]);
  });

  it("finds exercise prompts missing in a written language, by exercise", () => {
    const exercises = [
      { locales: { en: { prompt: "{{x}} + {{y}}?" }, sr: { prompt: "" } } },
      { locales: { en: { prompt: "Pick one" }, sr: { prompt: "Izaberi" } } },
    ];
    expect(promptGaps(exercises, ["en", "sr"])).toEqual([{ exercise: 1, field: "prompt", locale: "sr" }]);
  });
});
