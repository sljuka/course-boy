// The section summary (SLJ-45): one line describing a section, shown wherever
// sections are listed. Stored as each locale's `description`.
export const SECTION_SUMMARY_MAX_LENGTH = 128;

// `Intl.Segmenter` exists in Electron's Chromium, but tsconfig's `lib` (ES2020)
// has no types for it; declared here rather than widening `lib` for one use.
type GraphemeSegmenter = { segment(input: string): Iterable<{ segment: string }> };
const segmenter = new (
  Intl as unknown as {
    Segmenter: new (locale: undefined, options: { granularity: "grapheme" }) => GraphemeSegmenter;
  }
).Segmenter(undefined, { granularity: "grapheme" });

// Characters as people see them: an emoji (even 👨‍👩‍👧) counts as one, and
// Cyrillic and Latin count the same.
export function countCharacters(text: string): number {
  let count = 0;
  for (const _segment of segmenter.segment(text)) count += 1;
  return count;
}

// For lists: a summary longer than the limit (older courses' descriptions)
// is cut off with "…"; the text itself is never changed.
export function truncateSummary(text: string, max = SECTION_SUMMARY_MAX_LENGTH): string {
  if (countCharacters(text) <= max) {
    return text;
  }

  const kept: string[] = [];
  for (const { segment } of segmenter.segment(text)) {
    if (kept.length === max - 1) break;
    kept.push(segment);
  }
  return `${kept.join("").trimEnd()}…`;
}
