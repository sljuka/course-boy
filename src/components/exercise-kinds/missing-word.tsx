import { useTranslation } from "react-i18next";

import type {
  MissingWordCourseExercise,
  SharedMissingWordTestExerciseDefinition,
} from "@/lib/course-package";
import { decodeMissingWordAnswers, encodeMissingWordAnswers } from "@/lib/exercise-kinds/missing-word";

import { MissingWordExerciseFields } from "@/components/missing-word-exercise-fields";
import { MissingWordText } from "@/components/missing-word-tokens";
import { Input } from "@/components/ui/input";
import type { MissingWordTestExercise } from "@/components/test-editor-prototype-types";
import type { AnswerComponentProps, ExerciseKindEditor } from "@/components/exercise-kinds/types";
import {
  createExercise,
  fromShared,
  toShared,
  validate,
} from "@/components/exercise-kinds/missing-word-logic";

function AnswerComponent({
  exercise,
  index,
  onAnswerChange,
  value,
}: AnswerComponentProps<MissingWordCourseExercise>) {
  const { t } = useTranslation();
  const blankCount = exercise.segments.filter((segment) => segment.kind === "blank").length;
  const answers = decodeMissingWordAnswers(value, blankCount);

  return (
    <div className="print:hidden">
      <MissingWordText
        renderBlank={(blankIndex) => (
          <Input
            aria-label={t("courseDetails.answerPlaceholder")}
            className="inline-block w-32"
            id={`course-exercise-answer-${index}-${blankIndex}`}
            onChange={(event) =>
              onAnswerChange(
                encodeMissingWordAnswers(
                  answers.map((answer, currentIndex) =>
                    currentIndex === blankIndex ? event.target.value : answer,
                  ),
                ),
              )
            }
            value={answers[blankIndex] ?? ""}
          />
        )}
        segments={exercise.segments}
      />
    </div>
  );
}

export const missingWordExerciseEditor: ExerciseKindEditor<
  MissingWordTestExercise,
  SharedMissingWordTestExerciseDefinition,
  MissingWordCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: MissingWordExerciseFields,
  createExercise,
  fromShared,
  kind: "missing-word",
  label: "Missing words",
  description: "A passage with blanks the student fills in with the correct word or phrase.",
  toShared,
  validate,
};
