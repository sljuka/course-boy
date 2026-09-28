import { describe, expect, it } from "vitest";

import { blocksToMarkdown } from "@/lib/lesson-content-markdown";

import { buildDocumentSeed } from "./draft-document-seed";

const serbianBody = [
  "[matko-block]: <> (heading)",
  "## Naslov",
  "",
  "[matko-block]: <> (markdown)",
  "Srpski red 1",
].join("\n");

describe("buildDocumentSeed", () => {
  it("seeds every supported language from its own saved body", () => {
    const seed = buildDocumentSeed({ en: "", sr: serbianBody }, ["en", "sr"]);

    expect(Object.keys(seed).sort()).toEqual(["en", "sr"]);
    expect(blocksToMarkdown(seed.sr!)).toContain("Srpski red 1");
  });

  it("never gives a language another language's content", () => {
    const seed = buildDocumentSeed({ sr: serbianBody }, ["en", "sr"]);

    expect(blocksToMarkdown(seed.en!)).not.toContain("Srpski red 1");
  });

  it("uses the blank template only for languages with no saved content", () => {
    const seed = buildDocumentSeed({ en: "   \n", sr: serbianBody }, ["en", "sr"]);

    expect(seed.en?.[0]?.type).toBe("heading");
    expect(blocksToMarkdown(seed.en!)).not.toContain("Srpski");
  });
});
