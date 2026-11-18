import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import type {
  CourseTest,
  NumericCourseExercise,
  SharedNumericTestExerciseDefinition,
} from "@/lib/course-package";

import { NumericExerciseFields } from "@/components/numeric-exercise-fields";
import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { PrintAnswerArea } from "@/components/course-player/print-answer-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTestPlayerState } from "@/components/test-player/use-test-player-state";
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
import { interpolateTemplate } from "@/lib/course-player-utils";
import { decodeNumericAnswers, encodeNumericAnswers, numericSolutions } from "@/lib/exercise-kinds/numeric";
import { Label } from "@/components/ui/label";
import type { TFunction } from "i18next";

function AnswerComponent({
  exercise,
  index,
  onAnswerChange,
  parts,
  size,
  value,
}: AnswerComponentProps<NumericCourseExercise>) {
  const { t } = useTranslation();
  const boxCount = numericSolutions(exercise).length;

  if (boxCount > 1) {
    return (
      <SeveralAnswers
        exercise={exercise}
        index={index}
        onAnswerChange={onAnswerChange}
        parts={parts}
        size={size}
        value={value}
      />
    );
  }

  return (
    <div className="flex max-w-xs flex-col gap-3 print:hidden">
      <Input
        id={`course-exercise-answer-${index}`}
        onChange={(event) => onAnswerChange(event.target.value)}
        placeholder={exercise.answerPlaceholder || t("courseDetails.answerPlaceholder")}
        size={size}
        value={value}
      />
    </div>
  );
}

// Several solutions (SLJ-139): a labelled box each. Enter in any box but the
// last goes to the next one instead of checking the answer, so a half-done
// answer isn't checked by accident. After a check, a wrong box is marked.
function SeveralAnswers({
  exercise,
  index,
  onAnswerChange,
  parts,
  size,
  value,
}: Omit<AnswerComponentProps<NumericCourseExercise>, "instance">) {
  const { t } = useTranslation();
  const boxCount = numericSolutions(exercise).length;
  const answers = decodeNumericAnswers(value, boxCount);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <div className="flex max-w-sm flex-col gap-3 print:hidden" data-testid="numeric-answers">
      {answers.map((answer, boxIndex) => {
        const id = `course-exercise-answer-${index}-${boxIndex}`;
        return (
          <div className="flex flex-col gap-1.5" key={boxIndex}>
            <Label htmlFor={id}>{solutionLabel(exercise, boxIndex, t)}</Label>
            <Input
              aria-invalid={parts?.[boxIndex] === false || undefined}
              id={id}
              inputMode="decimal"
              onChange={(event) =>
                onAnswerChange(
                  encodeNumericAnswers(answers.map((current, i) => (i === boxIndex ? event.target.value : current))),
                )
              }
              onKeyDown={(event) => {
                if (event.key !== "Enter" || boxIndex === boxCount - 1) return;
                event.preventDefault();
                event.stopPropagation();
                inputsRef.current[boxIndex + 1]?.focus();
              }}
              placeholder={exercise.answerPlaceholder || t("courseDetails.answerPlaceholder")}
              ref={(element) => {
                inputsRef.current[boxIndex] = element;
              }}
              size={size}
              value={answer}
            />
          </div>
        );
      })}
    </div>
  );
}

// A solution's label in the reader's language, or "Answer 2" if it has none.
function solutionLabel(exercise: NumericCourseExercise, boxIndex: number, t: TFunction): string {
  return exercise.solutionLabels?.[boxIndex]?.trim() || t("courseDetails.answerNumber", { index: boxIndex + 1 });
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


function PrintAnswerComponent({
  exercise,
  printAnswerStyle,
}: PrintAnswerComponentProps<NumericCourseExercise>) {
  const { t } = useTranslation();
  const boxCount = numericSolutions(exercise).length;

  const rows = resolveSolutionSpaceRows(exercise.solutionSpace);

  // Several solutions (SLJ-139): a labelled answer area each, every one as
  // big as the solution area the teacher chose.
  if (boxCount > 1) {
    return (
      <div className="hidden flex-col gap-2 print:flex">
        {Array.from({ length: boxCount }, (_, boxIndex) => (
          <div className="flex flex-col gap-1" key={boxIndex}>
            <span className="text-sm">{solutionLabel(exercise, boxIndex, t)}</span>
            <PrintAnswerArea printAnswerStyle={printAnswerStyle} rows={rows} />
          </div>
        ))}
      </div>
    );
  }

  return <PrintAnswerArea printAnswerStyle={printAnswerStyle} rows={rows} />;
}


// The example in the "Add exercise" picker, in the app's language. The
// prompt's `{{x}}` placeholders are passed in, so i18next leaves them for
// the exercise to fill.
function buildExampleTest(t: TFunction): CourseTest {
  const exercise: NumericCourseExercise = {
    formula: "x - y + z",
    id: "example",
    kind: "numeric",
    precision: 0,
    prompt: t("exerciseExamples.numeric", { x: "{{x}}", y: "{{y}}", z: "{{z}}" }),
    solutionSpace: "sm",
    tags: [],
    variables: {
      x: { max: 20, min: 5, type: "integer" },
      y: { max: 5, min: 1, type: "integer" },
      z: { max: 5, min: 1, type: "integer" },
    },
  };

  return { exercises: [exercise], graded: false, id: "example", includeCourseExercises: false, partialCredit: false };
}

// A live, gradeable instance of the example — reuses the exact same state
// machine (`useTestPlayerState`) and grading runtime the real player and
// "Preview test" use, so checking the example's answer behaves identically
// to checking a real exercise's, not a lookalike.
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

  if (!exercise || !instance || exercise.kind !== "numeric" || instance.kind !== "numeric") {
    return null;
  }

  const promptSource = interpolateTemplate(exercise.prompt, instance.variables, {
    emphasizeValues: true,
  });
  const exerciseResult = exerciseResults[0];

  return (
    <div className="flex flex-col gap-3">
      <CardDescription className="flex items-start gap-1.5">
        <Badge className="size-6 shrink-0 justify-center" variant="secondary">
          1
        </Badge>
        <InlineMarkdown source={promptSource} />
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

export const numericExerciseEditor: ExerciseKindEditor<
  NumericTestExercise,
  SharedNumericTestExerciseDefinition,
  NumericCourseExercise
> = {
  AnswerComponent,
  ExampleComponent,
  FieldsComponent: NumericExerciseFields,
  PrintAnswerComponent,
  createExercise,
  fromShared,
  kind: "numeric",
  labelKey: "exerciseEditor.kinds.numeric.label",
  descriptionKey: "exerciseEditor.kinds.numeric.description",
  // Shown literally: how a variable is written in the story.
  descriptionValues: { variable: "{{x}}" },
  toShared,
  validate,
};
