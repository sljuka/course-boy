const NOTEBOOK_SQUARE_SIZE_PX = 18.9;

type PrintAnswerSquaresAreaProps = {
  rows: number;
};

function resolvePrintAnswerAreaMinHeight(rows: number) {
  return `${rows === 1 ? 3.25 : rows * 2.75}rem`;
}

export function PrintAnswerSquaresArea({
  rows,
}: PrintAnswerSquaresAreaProps) {
  return (
    <div
      className="relative overflow-hidden rounded-md border border-stone-200"
      style={{ minHeight: resolvePrintAnswerAreaMinHeight(rows) }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full text-stone-400/45"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            height={NOTEBOOK_SQUARE_SIZE_PX}
            id="print-squares-pattern"
            patternUnits="userSpaceOnUse"
            width={NOTEBOOK_SQUARE_SIZE_PX}
          >
            <path
              d={`M ${NOTEBOOK_SQUARE_SIZE_PX} 0 L 0 0 0 ${NOTEBOOK_SQUARE_SIZE_PX}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect fill="url(#print-squares-pattern)" height="100%" width="100%" />
      </svg>
    </div>
  );
}
