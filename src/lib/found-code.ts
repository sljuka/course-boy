import { normalizePublisherName } from "./publishers";
import type { FoundCode, FoundCodeContents } from "./sharing";

// The worker's look-up of a code (workers/main.cjs `peekCourse`) as what the
// Import dialog shows (SLJ-153). Everything in it comes from whoever shares
// the code, so only well-formed fields are kept, and texts are capped.

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2_000;

type Peeked = {
  contents?: unknown;
  kind?: unknown;
  manifest?: unknown;
  publisherId?: unknown;
  publisherName?: unknown;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function contentsFrom(value: unknown): FoundCodeContents | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const size = (field: unknown) => (typeof field === "number" && field >= 0 ? field : null);
  return {
    bytes: size(raw.bytes),
    files: size(raw.files),
    lessons: count(raw.lessons),
    limit: raw.limit === "COURSE_TOO_BIG" || raw.limit === "TOO_MANY_FILES" ? raw.limit : null,
    sections: count(raw.sections),
    tests: count(raw.tests),
  };
}

export function foundCodeFromPeek(peeked: Peeked): FoundCode {
  const manifest = (peeked.manifest && typeof peeked.manifest === "object" ? peeked.manifest : {}) as Record<
    string,
    unknown
  >;
  const isProgram = peeked.kind === "program";
  const rawLocales = (manifest.locales && typeof manifest.locales === "object" ? manifest.locales : {}) as Record<
    string,
    unknown
  >;
  const locales = Object.fromEntries(
    Object.entries(rawLocales)
      .filter(([locale, entry]) => /^[a-z]{2}(?:-[A-Za-z]{2,4})?$/.test(locale) && entry && typeof entry === "object")
      .slice(0, 10)
      .map(([locale, entry]) => {
        const { description, title } = entry as { description?: unknown; title?: unknown };
        return [locale, { description: text(description, MAX_DESCRIPTION_LENGTH), title: text(title, MAX_TITLE_LENGTH) }];
      }),
  );
  const supportedLocales = Array.isArray(manifest.supportedLocales)
    ? manifest.supportedLocales.filter((locale): locale is string => typeof locale === "string" && locale in locales)
    : Object.keys(locales);

  return {
    contentRating: !isProgram && typeof manifest.contentRating === "string" ? manifest.contentRating.slice(0, 32) : null,
    contents: contentsFrom(peeked.contents),
    courseCount: isProgram ? (Array.isArray(manifest.courses) ? manifest.courses.length : 0) : null,
    kind: isProgram ? (manifest.kind === "channel" ? "channel" : "program") : "course",
    locales,
    publisherId: typeof peeked.publisherId === "string" ? peeked.publisherId.slice(0, 128) : null,
    publisherName: normalizePublisherName(typeof peeked.publisherName === "string" ? peeked.publisherName : "") || null,
    status: "found",
    supportedLocales,
    version: !isProgram && typeof manifest.version === "string" ? manifest.version.slice(0, 32) : null,
  };
}
