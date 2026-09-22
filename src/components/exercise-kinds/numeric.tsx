import { useTranslation } from "react-i18next";

import type {
  CourseTest,
  NumericCourseExercise,
  SharedNumericTestExerciseDefinition,
} from "@/lib/course-package";

import { NumericExerciseFields } from "@/components/numeric-exercise-fields";
import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { PrintAnswerBoxArea } from "@/components/course-player/print-answer-box-area";
import { PrintAnswerLinesArea } from "@/components/course-player/print-answer-lines-area";
import { PrintAnswerSquaresArea } from "@/components/course-player/print-answer-squares-area";
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

function AnswerComponent({
  exercise,
  index,
  onAnswerChange,
  size,
  value,
}: AnswerComponentProps<NumericCourseExercise>) {
  const { t } = useTranslation();

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

const EXAMPLE_EXERCISE: NumericCourseExercise = {
  formula: "x - y + z",
  id: "example",
  kind: "numeric",
  precision: 0,
  prompt:
    "Mary had {{x}} apples. She sold {{y}} of them, then bought {{z}} more. How many apples does she have now?",
  solutionSpace: "sm",
  tags: [],
  variables: {
    x: { max: 20, min: 5, type: "integer" },
    y: { max: 5, min: 1, type: "integer" },
    z: { max: 5, min: 1, type: "integer" },
  },
};

const EXAMPLE_TEST: CourseTest = {
  exercises: [EXAMPLE_EXERCISE],
  id: "example",
};

const EXAMPLE_LESSON = { test: EXAMPLE_TEST };

// A live, gradeable instance of the example — reuses the exact same state
// machine (`useTestPlayerState`) and grading runtime the real player and
// "Preview test" use, so checking the example's answer behaves identically
// to checking a real exercise's, not a lookalike.
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
  label: "Template",
  description:
    'Template exercise is usually a story involving some activity that can be described numerically. Story can contain variables that are marked with {{x}} (this is example for variable "x"). Solution formula is provided which uses the values of the variable to calculate a solution. Teacher provides the story (prompt), variables (including their constraints) and a formula.',
  toShared,
  validate,
};
