export type MissingWordSegment =
  | { kind: "text"; value: string }
  | { kind: "blank"; variableName: string };

// {{c1}}, {{x}}, {{y}} — a named blank. Reusing the same name later in the
// text points at the same accepted-answer definition, but each occurrence
// still gets its own input in the player.
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

export function parseMissingWordMarkup(text: string): MissingWordSegment[] {
  const segments: MissingWordSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, matchIndex) });
    }

    segments.push({ kind: "blank", variableName: match[1] });
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

/** The unique variable names referenced in `text`, in first-appearance order. */
export function extractMissingWordVariableNames(text: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const name = match[1];

    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }

  return names;
}
