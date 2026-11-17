import { useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { ColumnArithmeticExerciseFields } from "@/components/column-arithmetic-exercise-fields";
import { PrintAnswerArea } from "@/components/course-player/print-answer-area";
import { createExercise, fromShared, toShared, validate } from "@/components/exercise-kinds/column-arithmetic-logic";
import type { AnswerComponentProps, ExerciseKindEditor, PrintAnswerComponentProps } from "@/components/exercise-kinds/types";
import type { ColumnArithmeticTestExercise } from "@/components/test-editor-prototype-types";
import { ColumnSum, ColumnSumCell, ColumnSumInput, ColumnSumRow } from "@/components/ui/column-sum";
import type {
  ColumnArithmeticCourseExercise,
  ColumnArithmeticOperation,
  CourseExerciseSolutionSpace,
  SharedColumnArithmeticTestExerciseDefinition,
} from "@/lib/course-package";
import type { ExerciseInstance } from "@/lib/course-player-utils";
import { columnCount, decodeColumnAnswer, digitsOf, encodeColumnAnswer } from "@/lib/exercise-kinds/column-arithmetic";

const SIGNS: Record<ColumnArithmeticOperation, string> = { add: "+", subtract: "−" };

// A gap before the hundreds, the hundred thousands…: 8 503 229.
const startsGroup = (column: number, count: number) => column % 3 === 2 && column < count - 1;

const columnsOf = (count: number) => Array.from({ length: count }, (_unused, column) => column);

function operandsOf(instance: ExerciseInstance): number[] {
  return instance.kind === "column-arithmetic" ? instance.operands : [];
}

// The numbers, stacked, the operation's sign before the last one. Each row
// lists its cells ones first (the rows lay them out right to left); the
// sign's cell comes last, so it sits on the left.
function OperandRows({ exercise, operands }: { exercise: ColumnArithmeticCourseExercise; operands: number[] }) {
  const count = columnCount(exercise.operation, operands);
  return operands.map((operand, row) => {
    const digits = digitsOf(operand);
    return (
      <ColumnSumRow data-testid="column-arithmetic-operand" key={row}>
        {columnsOf(count).map((column) => (
          <ColumnSumCell groupStart={startsGroup(column, count)} key={column}>
            {digits[column] ?? ""}
          </ColumnSumCell>
        ))}
        <ColumnSumCell>{row === operands.length - 1 ? SIGNS[exercise.operation] : ""}</ColumnSumCell>
      </ColumnSumRow>
    );
  });
}

// Written addition and subtraction (SLJ-231): the numbers stacked by place
// value, a box per digit of the answer under the line and a small box over
// each column for what's carried (or borrowed) into it. Typing a digit moves
// to the box on its left, as the answer is written on paper; Backspace in an
// empty box goes back to the right, and the arrow keys move along the row.
function AnswerComponent({ exercise, index, instance, onAnswerChange, parts, value }: AnswerComponentProps<ColumnArithmeticCourseExercise>) {
  const { t } = useTranslation();
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const operands = operandsOf(instance);
  if (operands.length === 0) return null;

  const count = columnCount(exercise.operation, operands);
  const answer = decodeColumnAnswer(value, count);
  // After a check: the answer's digits first, then the carries (when checked).
  const digitWrong = (column: number) => parts?.[column] === false;
  const carryWrong = (column: number) => exercise.gradeCarries && parts?.[count + column] === false;

  const write = (row: "carries" | "digits", column: number, typed: string) => {
    // The last digit typed: a box holds one, and typing over it replaces it.
    const digit = typed.replace(/\D/g, "").slice(-1);
    const next = { ...answer, [row]: answer[row].map((box, boxColumn) => (boxColumn === column ? digit : box)) };
    onAnswerChange(encodeColumnAnswer(next));
    if (row === "digits" && digit && column < count - 1) digitRefs.current[column + 1]?.focus();
  };

  const move = (event: KeyboardEvent<HTMLInputElement>, column: number) => {
    const target =
      event.key === "ArrowLeft"
        ? column + 1
        : event.key === "ArrowRight" || (event.key === "Backspace" && !event.currentTarget.value)
          ? column - 1
          : null;
    if (target === null || target < 0 || target >= count) return;
    event.preventDefault();
    digitRefs.current[target]?.focus();
  };

  return (
    <div className="print:hidden">
      <ColumnSum aria-label={t("columnArithmetic.answerLabel")} data-testid="column-arithmetic" role="group">
        <ColumnSumRow>
          {columnsOf(count).map((column) =>
            column === 0 ? (
              <ColumnSumCell key={column} size="carry" />
            ) : (
              <ColumnSumInput
                aria-invalid={carryWrong(column) || undefined}
                aria-label={t("columnArithmetic.carryLabel", { number: column + 1 })}
                data-testid="column-arithmetic-carry"
                groupStart={startsGroup(column, count)}
                key={column}
                onChange={(event) => write("carries", column, event.target.value)}
                size="carry"
                value={answer.carries[column] ?? ""}
              />
            ),
          )}
          <ColumnSumCell size="carry" />
        </ColumnSumRow>
        <OperandRows exercise={exercise} operands={operands} />
        <ColumnSumRow rule>
          {columnsOf(count).map((column) => (
            <ColumnSumInput
              aria-invalid={digitWrong(column) || undefined}
              aria-label={t("columnArithmetic.digitLabel", { number: column + 1 })}
              data-autofocus={column === 0 || undefined}
              data-testid="column-arithmetic-digit"
              groupStart={startsGroup(column, count)}
              id={column === 0 ? `course-exercise-answer-${index}` : undefined}
              key={column}
              onChange={(event) => write("digits", column, event.target.value)}
              onKeyDown={(event) => move(event, column)}
              ref={(element) => {
                digitRefs.current[column] = element;
              }}
              value={answer.digits[column] ?? ""}
            />
          ))}
          <ColumnSumCell />
        </ColumnSumRow>
      </ColumnSum>
    </div>
  );
}

// Room for working below the problem, in the printout's answer style: none
// for "sm" (the answer goes under the line), else as many rows as the
// numeric exercise leaves.
function extraPrintRows(space: CourseExerciseSolutionSpace): number {
  if (typeof space === "number") return space;
  return { sm: 0, md: 3, lg: 5, xl: 8 }[space];
}

// On paper: the numbers, the line and an empty row for the answer, then the
// room the teacher chose.
function PrintAnswerComponent({ exercise, instance, printAnswerStyle }: PrintAnswerComponentProps<ColumnArithmeticCourseExercise>) {
  const operands = operandsOf(instance);
  if (operands.length === 0) return null;
  const count = columnCount(exercise.operation, operands);
  const rows = extraPrintRows(exercise.solutionSpace);

  return (
    <div className="hidden flex-col gap-2 print:flex">
      {/* Its own block, so the line is only as wide as the numbers. */}
      <div>
        <ColumnSum>
          <OperandRows exercise={exercise} operands={operands} />
          <ColumnSumRow rule>
            {columnsOf(count).map((column) => (
              <ColumnSumCell groupStart={startsGroup(column, count)} key={column} />
            ))}
            <ColumnSumCell />
          </ColumnSumRow>
        </ColumnSum>
      </div>
      {rows > 0 && <PrintAnswerArea printAnswerStyle={printAnswerStyle} rows={rows} />}
    </div>
  );
}

export const columnArithmeticExerciseEditor: ExerciseKindEditor<
  ColumnArithmeticTestExercise,
  SharedColumnArithmeticTestExerciseDefinition,
  ColumnArithmeticCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: ColumnArithmeticExerciseFields,
  PrintAnswerComponent,
  createExercise,
  description:
    "Adding or subtracting big numbers in columns, as on squared paper: the student writes the answer digit by digit from the right, noting what's carried or borrowed. Each attempt gets new numbers from the ranges you set; each digit counts.",
  fromShared,
  kind: "column-arithmetic",
  label: "Written calculation",
  toShared,
  validate,
};
