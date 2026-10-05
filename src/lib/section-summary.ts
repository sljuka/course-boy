// The section summary (SLJ-45): one line describing a section, shown wherever
// sections are listed. Stored as each locale's `description`.
export const SECTION_SUMMARY_MAX_LENGTH = 128;

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

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
