import type {
  MultipleChoiceCourseExercise,
  SharedMultipleChoiceTestExerciseDefinition,
} from "@/lib/course-package";

import { MultipleChoiceExerciseFields } from "@/components/multiple-choice-exercise-fields";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { MultipleChoiceTestExercise } from "@/components/test-editor-prototype-types";
import type { AnswerComponentProps, ExerciseKindEditor } from "@/components/exercise-kinds/types";
import {
  createExercise,
  fromShared,
  toShared,
  validate,
} from "@/components/exercise-kinds/multiple-choice-logic";

function AnswerComponent({
  exercise,
  index,
  instance,
  onAnswerChange,
  value,
}: AnswerComponentProps<MultipleChoiceCourseExercise>) {
  if (instance.kind !== "multiple-choice") {
    return null;
  }

  return (
    <RadioGroup
      className="max-w-md print:hidden"
      onValueChange={(nextValue) => onAnswerChange(String(nextValue))}
      value={value || null}
    >
      {instance.optionOrder.map((optionIndex) => (
        <div className="flex items-center gap-2" key={optionIndex}>
          <RadioGroupItem
            id={`course-exercise-answer-${index}-${optionIndex}`}
            value={String(optionIndex)}
          />
          <Label htmlFor={`course-exercise-answer-${index}-${optionIndex}`}>
            {exercise.options[optionIndex]}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

export const multipleChoiceExerciseEditor: ExerciseKindEditor<
  MultipleChoiceTestExercise,
  SharedMultipleChoiceTestExerciseDefinition,
  MultipleChoiceCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: MultipleChoiceExerciseFields,
  createExercise,
  fromShared,
  kind: "multiple-choice",
  label: "Multiple choice",
  toShared,
  validate,
};
