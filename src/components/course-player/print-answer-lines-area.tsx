type PrintAnswerLinesAreaProps = {
  rows: number;
};

export function PrintAnswerLinesArea({
  rows,
}: PrintAnswerLinesAreaProps) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          className="border-b border-stone-500"
          key={`solution-row-${rowIndex + 1}`}
          style={{
            height: rows === 1 ? "3.25rem" : "2rem",
          }}
        />
      ))}
    </div>
  );
}
