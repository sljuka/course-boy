import { describe, expect, it } from "vitest";

import { foundCodeFromPeek } from "@/lib/found-code";

// SLJ-153: what a code is, from a stranger's drive, kept to well-formed fields.
describe("foundCodeFromPeek", () => {
  it("reads a course with what importing it brings", () => {
    const found = foundCodeFromPeek({
      contents: { bytes: 4096, files: 12, lessons: 5, limit: null, sections: 2, tests: 1 },
      kind: "course",
      manifest: {
        contentRating: "all-ages",
        id: "thys2vej6my5mpxt",
        locales: { en: { description: "About", title: "Math 5" }, sr: { description: "", title: "Matematika 5" } },
        supportedLocales: ["en", "sr"],
        version: "1.2",
      },
      publisherId: "4y9dgb89",
      publisherName: "Ana",
    });
    expect(found).toEqual({
      contentRating: "all-ages",
      contents: { bytes: 4096, files: 12, lessons: 5, limit: null, sections: 2, tests: 1 },
      courseCount: null,
      kind: "course",
      locales: { en: { description: "About", title: "Math 5" }, sr: { description: "", title: "Matematika 5" } },
      publisherId: "4y9dgb89",
      publisherName: "Ana",
      status: "found",
      supportedLocales: ["en", "sr"],
      version: "1.2",
    });
  });

  it("tells a channel from a program, and counts their courses", () => {
    const manifest = { courses: [{}, {}, {}], id: "abc", locales: { en: { title: "Ana's channel" } } };
    expect(foundCodeFromPeek({ kind: "program", manifest: { ...manifest, kind: "channel" } })).toMatchObject({
      contentRating: null,
      courseCount: 3,
      kind: "channel",
      version: null,
    });
    expect(foundCodeFromPeek({ kind: "program", manifest })).toMatchObject({ courseCount: 3, kind: "program" });
  });

  it("keeps only well-formed fields from a hostile drive", () => {
    const found = foundCodeFromPeek({
      contents: { bytes: -1, files: "many", lessons: 1.5, limit: "WHATEVER", sections: 2, tests: 0 },
      kind: "course",
      manifest: {
        locales: { en: { title: "x".repeat(500) }, "../evil": { title: "no" }, de: "not an object" },
        supportedLocales: ["en", "fr", 7],
      },
      publisherId: 42,
    });
    expect(found).toMatchObject({
      contents: { bytes: null, files: null, lessons: 0, limit: null, sections: 2, tests: 0 },
      publisherId: null,
      publisherName: null,
      supportedLocales: ["en"],
    });
    if (found.status !== "found") throw new Error("not found");
    expect(Object.keys(found.locales)).toEqual(["en"]);
    expect(found.locales.en?.title).toHaveLength(200);
  });
});
