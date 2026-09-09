import { useTranslation } from "react-i18next";

import type { NumericCourseExercise, SharedNumericTestExerciseDefinition } from "@/lib/course-package";

import { NumericExerciseFields } from "@/components/numeric-exercise-fields";
import { PrintAnswerBoxArea } from "@/components/course-player/print-answer-box-area";
import { PrintAnswerLinesArea } from "@/components/course-player/print-answer-lines-area";
import { PrintAnswerSquaresArea } from "@/components/course-player/print-answer-squares-area";
import { Input } from "@/components/ui/input";
import type { NumericTestExercise } from "@/components/test-editor-prototype-types";
import type {
  AnswerComponentProps,
  ExerciseKindEditor,
  PrintAnswerComponentProps,
} from "@/components/exercise-kinds/types";
import {
  createExercise,
  fromShared,
  toShared,
  validate,
} from "@/components/exercise-kinds/numeric-logic";

function AnswerComponent({
  index,
  onAnswerChange,
  value,
}: AnswerComponentProps<NumericCourseExercise>) {
  const { t } = useTranslation();

  return (
    <div className="flex max-w-xs flex-col gap-3 print:hidden">
      <Input
        id={`course-exercise-answer-${index}`}
        onChange={(event) => onAnswerChange(event.target.value)}
        placeholder={t("courseDetails.answerPlaceholder")}
        value={value}
      />
    </div>
  );
}

function resolveSolutionSpaceRows(solutionSpace: NumericCourseExercise["solutionSpace"]) {
  if (typeof solutionSpace === "number") {
    return solutionSpace;
  }

  switch (solutionSpace) {
    case "md":
      return 3;
    case "lg":
      return 5;
    case "xl":
      return 8;
    case "sm":
    default:
      return 1;
  }
}

function resolvePrintAnswerAreaMinHeight(rows: number) {
  return `${rows === 1 ? 3.25 : rows * 2.75}rem`;
}

function PrintAnswerComponent({
  exercise,
  printAnswerStyle,
}: PrintAnswerComponentProps<NumericCourseExercise>) {
  const solutionRows = resolveSolutionSpaceRows(exercise.solutionSpace);

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

export const numericExerciseEditor: ExerciseKindEditor<
  NumericTestExercise,
  SharedNumericTestExerciseDefinition,
  NumericCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: NumericExerciseFields,
  PrintAnswerComponent,
  createExercise,
  fromShared,
  kind: "numeric",
  label: "Numeric",
  toShared,
  validate,
};
