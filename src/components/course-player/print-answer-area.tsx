import type { CoursePrintAnswerStyle } from "@/lib/print-options";

import { PrintAnswerBoxArea } from "@/components/course-player/print-answer-box-area";
import { PrintAnswerLinesArea } from "@/components/course-player/print-answer-lines-area";
import { PrintAnswerSquaresArea } from "@/components/course-player/print-answer-squares-area";

function resolvePrintAnswerAreaMinHeight(rows: number) {
  return rows === 1 ? "var(--print-answer-single-row)" : `${rows * 2.75}rem`;
}

// Room to write an answer on paper, in the printout's chosen style (lines, a
// box, squares or empty space), `rows` high. Shared by the kinds whose answer
// is written by hand (numeric, rewrite).
export function PrintAnswerArea({
  printAnswerStyle,
  rows: solutionRows,
}: {
  printAnswerStyle: CoursePrintAnswerStyle;
  rows: number;
}) {
  return (
    <div className="hidden print:block">
      {printAnswerStyle === "lines" ? (
        <PrintAnswerLinesArea rows={solutionRows} />
      ) : printAnswerStyle === "box" ? (
        <PrintAnswerBoxArea rows={solutionRows} />
      ) : printAnswerStyle === "squares" ? (
        <PrintAnswerSquaresArea rows={solutionRows} />
      ) : (
        <div
          className="bg-transparent"
          style={{ minHeight: resolvePrintAnswerAreaMinHeight(solutionRows) }}
        />
      )}
    </div>
  );
}
