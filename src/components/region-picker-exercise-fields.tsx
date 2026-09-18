import { useRef } from "react";
import { Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { RegionPickerCanvas } from "@/components/region-picker-canvas";
import { useUploadCourseAssetMutation } from "@/lib/course-queries";
import { matkoAssetUrl } from "@/lib/course-assets";
import type { RegionPickerTestExercise } from "@/components/test-editor-prototype-types";
import {
  setSvgAsset,
  toggleCorrectShape,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/region-picker-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";

function getValidationLabel(status: "error" | "valid" | "warning") {
  switch (status) {
    case "error":
      return "Invalid";
    case "warning":
      return "Warning";
    case "valid":
      return "Valid";
  }
}

export function RegionPickerExerciseFields({
  courseId,
  exercise,
  locale,
  onChange,
}: FieldsComponentProps<RegionPickerTestExercise>) {
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const prompt = exercise.locales[locale]?.prompt ?? "";
  const validation = validate(exercise, locale);
  const uploadAssetMutation = useUploadCourseAssetMutation();

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`exercise-prompt-${exercise.id}-${locale}`}>Prompt</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-prompt-${exercise.id}-${locale}`}
          onChange={(event) =>
            onChange((currentExercise) => updatePrompt(currentExercise, locale, event.target.value))
          }
          placeholder="Mark countries from the Scandinavian peninsula"
          ref={promptRef}
          rows={2}
          value={prompt}
        />
      </Field>

      <Field>
        <FieldLabel>Diagram</FieldLabel>
        <div className="flex items-center gap-2">
          <Button
            disabled={uploadAssetMutation.isPending}
            onClick={() =>
              uploadAssetMutation.mutate(
                { courseId, kind: "svg" },
                {
                  onSuccess: (result) => {
                    if (result) {
                      onChange((currentExercise) => setSvgAsset(currentExercise, result.path));
                    }
                  },
                },
              )
            }
            size="sm"
            variant="outline"
          >
            <Upload aria-hidden="true" className="h-4 w-4" />
            {exercise.svgAssetFilename ? "Replace SVG" : "Upload SVG"}
          </Button>
          {exercise.svgAssetFilename && (
            <CardDescription>{exercise.svgAssetFilename}</CardDescription>
          )}
        </div>
        {exercise.svgAssetFilename && (
          <div>
            <CardDescription className="mb-2">
              Click the regions students should mark as correct.
            </CardDescription>
            <RegionPickerCanvas
              onToggleShape={(shapeId) =>
                onChange((currentExercise) => toggleCorrectShape(currentExercise, shapeId))
              }
              selectedShapeIds={exercise.correctShapeIds}
              svgUrl={matkoAssetUrl(courseId, exercise.svgAssetFilename)}
            />
          </div>
        )}
        {validation.status !== "idle" && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={validation.status === "valid" ? "success" : "warning"}>
              {getValidationLabel(validation.status)}
            </Badge>
            <CardDescription>{validation.message}</CardDescription>
          </div>
        )}
      </Field>
    </>
  );
}
