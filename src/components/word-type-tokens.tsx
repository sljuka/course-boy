import { Tag } from "@/components/ui/tag";
import { WordMarker } from "@/components/ui/word-marker";
import type { WordTypeToken } from "@/lib/course-package";

export type WordTypeLegendEntry = {
  color: string;
  icon: string;
  id: string;
  name: string;
  symbol: string;
};

export function WordTypeLegend({ wordTypes }: { wordTypes: WordTypeLegendEntry[] }) {
  if (wordTypes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {wordTypes.map((wordType) => (
        <Tag className="gap-1.5" color={wordType.color} key={wordType.id}>
          <span aria-hidden="true">{wordType.icon}</span>
          <span>{wordType.name || wordType.symbol}</span>
        </Tag>
      ))}
    </div>
  );
}

export function WordTypeTokens({
  onWordClick,
  selections,
  tokens,
  wordTypes,
}: {
  onWordClick?: (markedWordIndex: number) => void;
  selections: string[];
  tokens: WordTypeToken[];
  wordTypes: WordTypeLegendEntry[];
}) {
  const wordTypesById = new Map(wordTypes.map((wordType) => [wordType.id, wordType]));
  let markedWordIndex = -1;

  return (
    // pt-2: the floating icon above a marked word in the first line has no
    // line above it to make room, so the container needs a little headroom
    // of its own. Whatever wraps this must not clip (overflow-hidden) — see
    // the Card override in word-type-exercise-fields.tsx.
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-3 pt-2 leading-6 text-stone-700">
      {tokens.map((token, tokenIndex) => {
        if (token.kind === "text") {
          return <span key={tokenIndex}>{token.value}</span>;
        }

        markedWordIndex += 1;
        const currentMarkedWordIndex = markedWordIndex;
        const selectedType = wordTypesById.get(selections[currentMarkedWordIndex] ?? "");
        // The icon is an absolutely-positioned overlay, not part of the flex
        // flow — marking/unmarking a word (or picking a longer icon string)
        // never changes this block's box size, so the word itself never
        // shifts and the sentence never reflows.
        const tagContent = (
          <span className="relative inline-flex">
            {selectedType?.icon && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 leading-none whitespace-nowrap"
              >
                {selectedType.icon}
              </span>
            )}
            <WordMarker color={selectedType?.color} marked={Boolean(selectedType)}>
              {token.value}
            </WordMarker>
          </span>
        );

        if (!onWordClick) {
          return <span key={tokenIndex}>{tagContent}</span>;
        }

        return (
          <button
            aria-label={`${token.value}: ${selectedType?.name ?? "unmarked"}`}
            key={tokenIndex}
            onClick={() => onWordClick(currentMarkedWordIndex)}
            type="button"
          >
            {tagContent}
          </button>
        );
      })}
    </p>
  );
}
