import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import exampleSvgUrl from "@/assets/region-picker-example-europe.svg?url";

import type {
  CourseTest,
  RegionLabelCourseExercise,
  SharedRegionLabelTestExerciseDefinition,
} from "@/lib/course-package";
import { decodeRegionLabelAnswers, encodeRegionLabelAnswers } from "@/lib/exercise-kinds/region-label";

import { RegionLabelExerciseFields } from "@/components/region-label-exercise-fields";
import { RegionPickerCanvas } from "@/components/region-picker-canvas";
import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tag } from "@/components/ui/tag";
import { useTestPlayerState } from "@/components/test-player/use-test-player-state";
import type { RegionLabelTestExercise } from "@/components/test-editor-prototype-types";
import type { AnswerComponentProps, ExerciseKindEditor } from "@/components/exercise-kinds/types";
import {
  createExercise,
  fromShared,
  toShared,
  validate,
} from "@/components/exercise-kinds/region-label-logic";

function AnswerComponent({
  exercise,
  index: exerciseIndex,
  onAnswerChange,
  value,
}: AnswerComponentProps<RegionLabelCourseExercise>) {
  const { t } = useTranslation();
  const answers = decodeRegionLabelAnswers(value, exercise.regions.length);
  const shapeColors = useMemo(
    () => Object.fromEntries(exercise.regions.map((region) => [region.id, region.color])),
    [exercise.regions],
  );
  const shapeLabels = useMemo(
    () =>
      Object.fromEntries(
        exercise.regions.map((region, index) => [region.id, String(index + 1)]),
      ),
    [exercise.regions],
  );
  const shapeLabelOffsets = useMemo(
    () =>
      Object.fromEntries(
        exercise.regions.filter((region) => region.labelOffset).map((region) => [region.id, region.labelOffset!]),
      ),
    [exercise.regions],
  );

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <RegionPickerCanvas
        onToggleShape={() => {
          // Not click-driven for the student — they type into the numbered
          // list below instead of marking the diagram themselves.
        }}
        shapeColors={shapeColors}
        shapeLabelOffsets={shapeLabelOffsets}
        shapeLabels={shapeLabels}
        svgUrl={exercise.svgAssetUrl}
        viewBox={exercise.viewBox}
      />
      <ol className="flex flex-col gap-2">
        {exercise.regions.map((region, regionIndex) => (
          <li className="flex items-center gap-2" key={region.id}>
            <Tag color={region.color}>{regionIndex + 1}</Tag>
            <Input
              aria-label={t("courseDetails.answerPlaceholder")}
              className="max-w-64"
              id={`course-exercise-answer-${exerciseIndex}-${regionIndex}`}
              onChange={(event) =>
                onAnswerChange(
                  encodeRegionLabelAnswers(
                    answers.map((answer, currentIndex) =>
                      currentIndex === regionIndex ? event.target.value : answer,
                    ),
                  ),
                )
              }
              value={answers[regionIndex] ?? ""}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

// The exact three-region example from the region-marker feature's own design
// conversation (Hungary/Norway/Ireland), on the same bundled map
// region-picker's example uses — a real map, not a simplified stand-in.
const EXAMPLE_EXERCISE: RegionLabelCourseExercise = {
  id: "example",
  kind: "region-label",
  prompt: "Name each numbered country.",
  regions: [
    { answers: ["Hungary"], color: "#bbf7d0", id: "Hungary", matchCase: false },
    { answers: ["Norway"], color: "#fecaca", id: "Norway", matchCase: false },
    { answers: ["Ireland"], color: "#bfdbfe", id: "Ireland", matchCase: false },
  ],
  svgAssetUrl: exampleSvgUrl,
  tags: [],
};

const EXAMPLE_TEST: CourseTest = {
  exercises: [EXAMPLE_EXERCISE],
  id: "example",
};

const EXAMPLE_LESSON = { test: EXAMPLE_TEST };

// A live, gradeable instance of the example — reuses the exact same state
// machine (`useTestPlayerState`) and grading runtime the real player and
// "Preview test" use.
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
    exercise.kind !== "region-label" ||
    instance.kind !== "region-label"
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

export const regionLabelExerciseEditor: ExerciseKindEditor<
  RegionLabelTestExercise,
  SharedRegionLabelTestExerciseDefinition,
  RegionLabelCourseExercise
> = {
  AnswerComponent,
  ExampleComponent,
  FieldsComponent: RegionLabelExerciseFields,
  createExercise,
  fromShared,
  kind: "region-label",
  label: "Region label",
  description:
    "A diagram with numbered, colored regions the student labels by typing the correct name for each number.",
  toShared,
  validate,
};
