export type WordTypeToken =
  | { kind: "text"; value: string }
  | { kind: "word"; value: string; wordTypeId: string };

// `(house-warming gift){{n}}` marks a whole run of sequential words — e.g. a
// multi-word phrase — as a single unit; `word{{n}}` (no spaces, so no
// parentheses needed) marks just one word. Parentheses don't nest, so a
// phrase can't itself contain "(" or ")".
const MARKUP_PATTERN = /(?:\(([^()]+)\)|(\S+))\{\{([^{}\s]+)\}\}/g;

export function parseWordTypeMarkup(
  text: string,
  symbolToId: Map<string, string>,
): WordTypeToken[] {
  const tokens: WordTypeToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MARKUP_PATTERN)) {
    const [fullMatch, phrase, word, symbol] = match;
    const matchIndex = match.index ?? 0;
    const wordTypeId = symbolToId.get(symbol);

    if (!wordTypeId) {
      continue;
    }

    if (matchIndex > lastIndex) {
      tokens.push({ kind: "text", value: text.slice(lastIndex, matchIndex) });
    }

    tokens.push({ kind: "word", value: phrase ?? word, wordTypeId });
    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

export function extractWordTypeSymbols(text: string): string[] {
  const symbols = new Set<string>();

  for (const match of text.matchAll(MARKUP_PATTERN)) {
    symbols.add(match[3]);
  }

  return [...symbols];
}

/**
 * The correct wordTypeId for each *marked word*, in document order, skipping
 * "text" tokens entirely. This is the shape both the player's selection
 * array (`decodeWordTypeSelections`, sized to marked-word count) and the
 * editor's answer-key preview must align to — indexing by raw token
 * position instead (i.e. including a slot for every "text" token) silently
 * shifts every selection after the first text gap onto the wrong word.
 */
export function extractMarkedWordTypeIds(tokens: WordTypeToken[]): string[] {
  return tokens
    .filter((token): token is Extract<WordTypeToken, { kind: "word" }> => token.kind === "word")
    .map((token) => token.wordTypeId);
}
