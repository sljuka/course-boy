import { useTranslation } from "react-i18next";

import type {
  CourseTest,
  MultipleChoiceCourseExercise,
  SharedMultipleChoiceTestExerciseDefinition,
} from "@/lib/course-package";
import {
  decodeMultipleChoiceSelection,
  encodeMultipleChoiceSelection,
} from "@/lib/exercise-kinds/multiple-choice";

import { MultipleChoiceExerciseFields } from "@/components/multiple-choice-exercise-fields";
import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTestPlayerState } from "@/components/test-player/use-test-player-state";
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

  const selectedIndexes = decodeMultipleChoiceSelection(value);

  if (exercise.selectionMode === "single") {
    return (
      <RadioGroup
        className="max-w-md print:hidden"
        onValueChange={(nextValue) =>
          onAnswerChange(encodeMultipleChoiceSelection([Number(nextValue)]))
        }
        value={selectedIndexes.length > 0 ? String(selectedIndexes[0]) : null}
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

  return (
    <div className="flex max-w-md flex-col gap-2 print:hidden">
      {instance.optionOrder.map((optionIndex) => (
        <div className="flex items-center gap-2" key={optionIndex}>
          <Checkbox
            checked={selectedIndexes.includes(optionIndex)}
            id={`course-exercise-answer-${index}-${optionIndex}`}
            onCheckedChange={() =>
              onAnswerChange(
                encodeMultipleChoiceSelection(
                  selectedIndexes.includes(optionIndex)
                    ? selectedIndexes.filter((selectedIndex) => selectedIndex !== optionIndex)
                    : [...selectedIndexes, optionIndex],
                ),
              )
            }
          />
          <Label htmlFor={`course-exercise-answer-${index}-${optionIndex}`}>
            {exercise.options[optionIndex]}
          </Label>
        </div>
      ))}
    </div>
  );
}

const EXAMPLE_EXERCISE: MultipleChoiceCourseExercise = {
  correctOptionIndexes: [1, 2],
  id: "example",
  kind: "multiple-choice",
  options: ["Tokyo", "Paris", "Berlin", "Cairo"],
  prompt: "Which of these are capitals of European countries?",
  selectionMode: "multiple",
  tags: [],
};

const EXAMPLE_TEST: CourseTest = {
  exercises: [EXAMPLE_EXERCISE],
  id: "example",
};

const EXAMPLE_LESSON = { test: EXAMPLE_TEST };

// A live, gradeable instance of the example — reuses the exact same state
// machine (`useTestPlayerState`) and grading runtime the real player and
// "Preview test" use, so checking the example's answer behaves identically
// to checking a real exercise's.
function ExampleComponent() {
  const { t } = useTranslation();
  const {
    activeTestExercises,
    activeTestInstances,
    exerciseAnswers,
    exerciseResults,
    isTestPassed,
    submitExercise,
    testFeedback,
    updateExerciseAnswer,
  } = useTestPlayerState(EXAMPLE_LESSON);

  const exercise = activeTestExercises[0];
  const instance = activeTestInstances[0];

  if (
    !exercise ||
    !instance ||
    exercise.kind !== "multiple-choice" ||
    instance.kind !== "multiple-choice"
  ) {
    return null;
  }

  const exerciseResult = exerciseResults[0];

  return (
    <div className="flex flex-col gap-3">
      <CardDescription className="flex items-start gap-1.5">
        <Badge className="size-6 shrink-0 justify-center" variant="secondary">
          1
        </Badge>
        <InlineMarkdown source={exercise.prompt} />
      </CardDescription>
      <AnswerComponent
        exercise={exercise}
        index={0}
        instance={instance}
        onAnswerChange={(value) => updateExerciseAnswer(0, value)}
        value={exerciseAnswers[0] ?? ""}
      />
      {exerciseResult?.feedback && (
        <div className="text-sm font-medium text-destructive">{exerciseResult.feedback}</div>
      )}
      {testFeedback && (
        <div
          className={
            isTestPassed
              ? "text-sm font-medium text-success"
              : "text-sm font-medium text-destructive"
          }
        >
          {testFeedback}
        </div>
      )}
      <Button className="self-start" onClick={submitExercise} size="sm">
        {t("courseDetails.checkAnswer")}
      </Button>
    </div>
  );
}

export const multipleChoiceExerciseEditor: ExerciseKindEditor<
  MultipleChoiceTestExercise,
  SharedMultipleChoiceTestExerciseDefinition,
  MultipleChoiceCourseExercise
> = {
  AnswerComponent,
  ExampleComponent,
  FieldsComponent: MultipleChoiceExerciseFields,
  createExercise,
  fromShared,
  kind: "multiple-choice",
  label: "Multiple choice",
  description:
    "A prompt with several options where the student can mark one, several, or none of them as correct. Turn on \"Single answer\" below for a classic one-correct-answer question (shown with radio buttons); leave it off to let students check every option they believe is correct.",
  toShared,
  validate,
};
