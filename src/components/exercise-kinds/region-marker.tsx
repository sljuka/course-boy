import { useMemo } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import exampleSvgUrl from "@/assets/region-picker-example-europe.svg?url";

import type {
  CourseTest,
  RegionMarkerCourseExercise,
  SharedRegionMarkerTestExerciseDefinition,
} from "@/lib/course-package";
import {
  cycleRegionMarkerColor,
  decodeRegionMarkerSelections,
} from "@/lib/exercise-kinds/region-marker";

import { RegionMarkerExerciseFields } from "@/components/region-marker-exercise-fields";
import { RegionPickerCanvas } from "@/components/region-picker-canvas";
import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { useTestPlayerState } from "@/components/test-player/use-test-player-state";
import type { RegionMarkerTestExercise } from "@/components/test-editor-prototype-types";
import type { AnswerComponentProps, ExerciseKindEditor } from "@/components/exercise-kinds/types";
import {
  createExercise,
  fromShared,
  toShared,
  validate,
} from "@/components/exercise-kinds/region-marker-logic";

function AnswerComponent({
  exercise,
  onAnswerChange,
  value,
}: AnswerComponentProps<RegionMarkerCourseExercise>) {
  // Distinct colors in first-appearance order — the fixed cycle every click
  // steps through, one color per click, wrapping back to "unmarked".
  const usedColors = useMemo(
    () => [...new Set(exercise.regions.map((region) => region.color))],
    [exercise.regions],
  );
  // Any shape on the diagram is clickable, not just the teacher's designated
  // regions — the student has to find the right country themselves, so
  // restricting clicks to a hidden subset would make most of the map look
  // (and be) unresponsive. Grading below only checks the designated regions;
  // coloring some other country costs nothing.
  const shapeColors = decodeRegionMarkerSelections(value);

  return (
    // The diagram and its color legend print as-is — a student colors the
    // diagram by hand on paper, so there's no separate print-only answer
    // area to swap in the way an `<Input>`-based kind needs one.
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {exercise.regions.map((region) => (
          <Tag color={region.color} key={region.id}>
            {region.label}
          </Tag>
        ))}
      </div>
      <RegionPickerCanvas
        onToggleShape={(shapeId) =>
          onAnswerChange(cycleRegionMarkerColor(value, shapeId, usedColors))
        }
        shapeColors={shapeColors}
        svgUrl={exercise.svgAssetUrl}
        viewBox={exercise.viewBox}
      />
    </div>
  );
}

// The exact three-region example from the feature's own design conversation
// (Hungary/Norway/Ireland), on the same bundled map region-picker's example
// uses — a real map, not a simplified stand-in.
// The example in the "Add exercise" picker, in the app's language. The
// regions' ids are the map's shapes, their labels the countries' names.
function buildExampleTest(t: TFunction): CourseTest {
  const exercise: RegionMarkerCourseExercise = {
    id: "example",
    kind: "region-marker",
    prompt: t("exerciseExamples.regionMarker"),
    regions: [
      { color: "#bbf7d0", id: "Hungary", label: t("exerciseExamples.countries.hungary") },
      { color: "#fecaca", id: "Norway", label: t("exerciseExamples.countries.norway") },
      { color: "#bfdbfe", id: "Ireland", label: t("exerciseExamples.countries.ireland") },
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
    exercise.kind !== "region-marker" ||
    instance.kind !== "region-marker"
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

export const regionMarkerExerciseEditor: ExerciseKindEditor<
  RegionMarkerTestExercise,
  SharedRegionMarkerTestExerciseDefinition,
  RegionMarkerCourseExercise
> = {
  AnswerComponent,
  ExampleComponent,
  FieldsComponent: RegionMarkerExerciseFields,
  createExercise,
  fromShared,
  kind: "region-marker",
  labelKey: "exerciseEditor.kinds.regionMarker.label",
  descriptionKey: "exerciseEditor.kinds.regionMarker.description",
  toShared,
  validate,
};
