import { getTagAccentStyle, Tag } from "@/components/ui/tag";
import { WordMarker } from "@/components/ui/word-marker";
import type { WordTypeToken } from "@/lib/course-package";
import { cn } from "@/lib/utils";

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
    <>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {wordTypes.map((wordType) => (
          <Tag className="gap-1.5" color={wordType.color} key={wordType.id}>
            {/* Omitted entirely (not just empty) when a type has no icon —
                an empty-but-present flex child still reserves its `gap`,
                which pushed the name off-center inside the pill. */}
            {wordType.icon && <span aria-hidden="true">{wordType.icon}</span>}
            <span>{wordType.name || wordType.symbol}</span>
          </Tag>
        ))}
      </div>
      {/* Print swaps the pill+icon chips for the name plus its own color as
          a plain underline — a colored badge with an icon means nothing on
          paper, but "Verb, underlined blue" is a legend a student can
          actually use with a pen (see `WordTypeTokens`' own print variant,
          which prints the passage as plain text for exactly that). */}
      <div className="hidden flex-wrap items-center gap-4 print:flex">
        {wordTypes.map((wordType) => {
          const accent = getTagAccentStyle(wordType.color);

          return (
            <span
              className={cn(
                "border-b-2 pb-0.5 text-sm font-medium text-foreground",
                accent.className,
              )}
              key={wordType.id}
              style={accent.style}
            >
              {wordType.name || wordType.symbol}
            </span>
          );
        })}
      </div>
    </>
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
  const hasIcons = wordTypes.some((wordType) => wordType.icon);
  let markedWordIndex = -1;

  return (
    <>
      <p
        className={cn(
          "flex flex-wrap items-center gap-x-1.5 leading-6 text-foreground print:hidden",
          hasIcons
            ? // pt-6 gives the first line's floating icon headroom above the
              // container itself (nothing to clip into there); gap-y-6 gives
              // every wrapped line the same headroom above the line before it
              // — a smaller gap left an icon on line 2+ overlapping line 1's
              // text. Whatever wraps this must not clip (overflow-hidden) —
              // see the Card override in word-type-exercise-fields.tsx. Only
              // needed when some word type actually has an icon to float.
              "gap-y-6 pt-6"
            : "gap-y-3",
        )}
      >
        {tokens.map((token, tokenIndex) => {
          if (token.kind === "text") {
            return <span key={tokenIndex}>{token.value}</span>;
          }

          markedWordIndex += 1;
          const currentMarkedWordIndex = markedWordIndex;
          const selectedType = wordTypesById.get(selections[currentMarkedWordIndex] ?? "");
          // The icon is an absolutely-positioned overlay, not part of the
          // flex flow — marking/unmarking a word (or picking a longer icon
          // string) never changes this block's box size, so the word itself
          // never shifts and the sentence never reflows.
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
              className="group cursor-pointer"
              key={tokenIndex}
              onClick={() => onWordClick(currentMarkedWordIndex)}
              type="button"
            >
              {tagContent}
            </button>
          );
        })}
      </p>
      {/* Print: plain running text, no button chrome or the flex layout's
          uniform inter-word gap — reads like a normal sentence instead of a
          row of chips, so a student can underline/circle words by hand
          using the legend's colors (see `WordTypeLegend`'s own print
          variant) rather than relying on a pre-marked selection state. */}
      <p className="hidden text-foreground print:block">
        {tokens.map((token, tokenIndex) => (
          <span key={tokenIndex}>{token.value}</span>
        ))}
      </p>
    </>
  );
}
