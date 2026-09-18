import { useTranslation } from "react-i18next";

import exampleSvgUrl from "@/assets/region-picker-example-europe.svg?url";

import type {
  CourseTest,
  RegionPickerCourseExercise,
  SharedRegionPickerTestExerciseDefinition,
} from "@/lib/course-package";
import {
  decodeRegionPickerSelection,
  encodeRegionPickerSelection,
} from "@/lib/exercise-kinds/region-picker";

import { RegionPickerExerciseFields } from "@/components/region-picker-exercise-fields";
import { RegionPickerCanvas } from "@/components/region-picker-canvas";
import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { useTestPlayerState } from "@/components/test-player/use-test-player-state";
import type { RegionPickerTestExercise } from "@/components/test-editor-prototype-types";
import type { AnswerComponentProps, ExerciseKindEditor } from "@/components/exercise-kinds/types";
import {
  createExercise,
  fromShared,
  toShared,
  validate,
} from "@/components/exercise-kinds/region-picker-logic";

function AnswerComponent({
  exercise,
  onAnswerChange,
  value,
}: AnswerComponentProps<RegionPickerCourseExercise>) {
  const selectedShapeIds = decodeRegionPickerSelection(value);

  return (
    <div className="print:hidden">
      <RegionPickerCanvas
        onToggleShape={(shapeId) =>
          onAnswerChange(
            encodeRegionPickerSelection(
              selectedShapeIds.includes(shapeId)
                ? selectedShapeIds.filter((selectedId) => selectedId !== shapeId)
                : [...selectedShapeIds, shapeId],
            ),
          )
        }
        selectedShapeIds={selectedShapeIds}
        svgUrl={exercise.svgAssetUrl}
      />
    </div>
  );
}

// A real map, bundled as a static asset (not a course asset — this example
// has no course/upload behind it) so the wizard's example is the real thing
// a teacher would upload, not a simplified stand-in. Shape ids are the
// actual country names Inkscape assigned when the map was authored.
const EXAMPLE_EXERCISE: RegionPickerCourseExercise = {
  correctShapeIds: ["Norway", "Sweden"],
  id: "example",
  kind: "region-picker",
  prompt: "Mark the countries of the Scandinavian peninsula.",
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
    exercise.kind !== "region-picker" ||
    instance.kind !== "region-picker"
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

export const regionPickerExerciseEditor: ExerciseKindEditor<
  RegionPickerTestExercise,
  SharedRegionPickerTestExerciseDefinition,
  RegionPickerCourseExercise
> = {
  AnswerComponent,
  ExampleComponent,
  FieldsComponent: RegionPickerExerciseFields,
  createExercise,
  fromShared,
  kind: "region-picker",
  label: "Region picker",
  description:
    "Upload a diagram (an SVG with id'd shapes, like a country map) and mark which shapes are the correct answer. Students answer by clicking the same shapes in the diagram.",
  toShared,
  validate,
};
