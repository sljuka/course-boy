type PrintAnswerBoxAreaProps = {
  rows: number;
};

function resolvePrintAnswerAreaMinHeight(rows: number) {
  return rows === 1 ? "var(--print-answer-single-row)" : `${rows * 2.75}rem`;
}

export function PrintAnswerBoxArea({
  rows,
}: PrintAnswerBoxAreaProps) {
  return (
    <div
      className="rounded-md border border-dashed border-stone-300"
      style={{
        minHeight: resolvePrintAnswerAreaMinHeight(rows),
      }}
    />
  );
}
