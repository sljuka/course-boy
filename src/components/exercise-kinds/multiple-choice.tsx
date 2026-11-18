import { useMemo } from "react";
import type { TFunction } from "i18next";
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
import { ReadAloudButton } from "@/components/read-aloud-button";
import { exerciseSpeechLanguage } from "@/lib/exercise-speech";
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
import { cn } from "@/lib/utils";

// Print: a plain option list with a blank check/radio mark next to each one
// — a circle for single-answer (matching the on-screen radio buttons), a
// square for multi-answer (matching the checkboxes) — for a student to fill
// in by hand. Shared by both selection modes below rather than duplicated.
function PrintOptionList({
  exercise,
  optionOrder,
}: {
  exercise: MultipleChoiceCourseExercise;
  optionOrder: number[];
}) {
  return (
    <div className="hidden flex-col gap-2 print:flex">
      {optionOrder.map((optionIndex) => (
        <div className="flex items-center gap-2" key={optionIndex}>
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 shrink-0 border border-foreground",
              exercise.selectionMode === "single" ? "rounded-full" : "rounded-sm",
            )}
          />
          <span>{exercise.options[optionIndex]}</span>
        </div>
      ))}
    </div>
  );
}

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
      <>
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
              <ReadAloudButton language={exerciseSpeechLanguage(exercise)} text={exercise.options[optionIndex]} />
            </div>
          ))}
        </RadioGroup>
        <PrintOptionList exercise={exercise} optionOrder={instance.optionOrder} />
      </>
    );
  }

  return (
    <>
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
            <ReadAloudButton language={exerciseSpeechLanguage(exercise)} text={exercise.options[optionIndex]} />
          </div>
        ))}
      </div>
      <PrintOptionList exercise={exercise} optionOrder={instance.optionOrder} />
    </>
  );
}

// The example in the "Add exercise" picker, in the app's language.
function buildExampleTest(t: TFunction): CourseTest {
  const exercise: MultipleChoiceCourseExercise = {
    correctOptionIndexes: [1, 2],
    id: "example",
    kind: "multiple-choice",
    options: [
      t("exerciseExamples.cities.tokyo"),
      t("exerciseExamples.cities.paris"),
      t("exerciseExamples.cities.berlin"),
      t("exerciseExamples.cities.cairo"),
    ],
    prompt: t("exerciseExamples.multipleChoice"),
    selectionMode: "multiple",
    tags: [],
  };

  return { exercises: [exercise], graded: false, id: "example", includeCourseExercises: false, partialCredit: false };
}

// A live, gradeable instance of the example — reuses the exact same state
// machine (`useTestPlayerState`) and grading runtime the real player and
// "Preview test" use, so checking the example's answer behaves identically
// to checking a real exercise's.
function ExampleComponent() {
  const { t } = useTranslation();
  // Rebuilt only when the language changes: a new one starts the example over.
  const exampleLesson = useMemo(() => ({ test: buildExampleTest(t) }), [t]);
  const {
    activeTestExercises,
    activeTestInstances,
    exerciseAnswers,
    exerciseResults,
    isTestPassed,
    submitExercise,
    testFeedback,
    updateExerciseAnswer,
  } = useTestPlayerState(exampleLesson);

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
      <Button className="self-start" onClick={submitExercise} size="sm" variant="secondary">
        {t("courseDetails.checkExampleAnswer")}
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
  labelKey: "exerciseEditor.kinds.multipleChoice.label",
  descriptionKey: "exerciseEditor.kinds.multipleChoice.description",
  toShared,
  validate,
};
