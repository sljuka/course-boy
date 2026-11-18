import { useMemo } from "react";
import type { TFunction } from "i18next";
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
  size,
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
    // The diagram prints as-is (it's the point of the exercise), but the
    // numbered list below swaps its live `<Input>`s for plain blank lines —
    // consistent with every other kind's print answer area, and unlike
    // those kinds this needs no size control: one short line per region is
    // always enough for a typed-in country name.
    <div className="flex flex-col gap-3">
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
      <ol className="flex flex-col gap-2 print:hidden">
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
              size={size}
              value={answers[regionIndex] ?? ""}
            />
          </li>
        ))}
      </ol>
      <ol className="hidden flex-col gap-2 print:flex">
        {exercise.regions.map((region, regionIndex) => (
          <li className="flex items-center gap-2" key={region.id}>
            <Tag color={region.color}>{regionIndex + 1}</Tag>
            {/* eslint-disable-next-line shadcn/no-raw-colors -- print-only (hidden except print:flex above), stays literal for paper regardless of app theme */}
            <span className="h-6 w-48 border-b border-stone-500" />
          </li>
        ))}
      </ol>
    </div>
  );
}

// The exact three-region example from the region-marker feature's own design
// conversation (Hungary/Norway/Ireland), on the same bundled map
// region-picker's example uses — a real map, not a simplified stand-in.
// The example in the "Add exercise" picker, in the app's language. The
// regions' ids are the map's shapes; each accepts its name in the app's
// language and in English.
function buildExampleTest(t: TFunction): CourseTest {
  const region = (id: string, key: string, color: string) => ({
    answers: [...new Set([t(`exerciseExamples.countries.${key}`), id])],
    color,
    id,
    matchCase: false,
  });
  const exercise: RegionLabelCourseExercise = {
    id: "example",
    kind: "region-label",
    prompt: t("exerciseExamples.regionLabel"),
    regions: [
      region("Hungary", "hungary", "#bbf7d0"),
      region("Norway", "norway", "#fecaca"),
      region("Ireland", "ireland", "#bfdbfe"),
    ],
    svgAssetUrl: exampleSvgUrl,
    tags: [],
  };

  return { exercises: [exercise], graded: false, id: "example", includeCourseExercises: false, partialCredit: false };
}

// A live, gradeable instance of the example — reuses the exact same state
// machine (`useTestPlayerState`) and grading runtime the real player and
// "Preview test" use.
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
  labelKey: "exerciseEditor.kinds.regionLabel.label",
  descriptionKey: "exerciseEditor.kinds.regionLabel.description",
  toShared,
  validate,
};
