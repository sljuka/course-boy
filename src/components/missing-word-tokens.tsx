import type { ReactNode } from "react";

import { WordMarker } from "@/components/ui/word-marker";
import type { MissingWordSegment } from "@/lib/course-package";

/**
 * Renders a sentence with each of its blanks inline. `renderBlank` swaps in
 * the real interactive input (keyed by occurrence index and the variable
 * name it belongs to) for the player; the editor preview renders a static
 * placeholder per blank instead.
 */
export function MissingWordText({
  renderBlank,
  segments,
}: {
  renderBlank?: (blankIndex: number, variableName: string) => ReactNode;
  segments: MissingWordSegment[];
}) {
  let blankIndex = -1;

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-2 leading-8 text-stone-700">
      {segments.map((segment, index) => {
        if (segment.kind === "text") {
          return <span key={index}>{segment.value}</span>;
        }

        blankIndex += 1;
        const currentBlankIndex = blankIndex;

        return (
          <span key={index}>
            {renderBlank ? (
              renderBlank(currentBlankIndex, segment.variableName)
            ) : (
              <WordMarker aria-hidden="true" className="inline-block w-24">
                &nbsp;
              </WordMarker>
            )}
          </span>
        );
      })}
    </p>
  );
}
