import { useCallback, useRef, useState } from "react";
import { Info, Map, RotateCcw, Upload, X, ZoomIn } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { RegionPickerCanvas } from "@/components/region-picker-canvas";
import { useApplySvgPresetMutation, useUploadCourseAssetMutation } from "@/lib/course-queries";
import { matkoAssetUrl } from "@/lib/course-assets";
import { regionPickerSvgPresets } from "@/lib/region-picker-svg-presets";
import type { RegionPickerTestExercise } from "@/components/test-editor-prototype-types";
import {
  clearSvgAsset,
  setSvgAsset,
  setViewBox,
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
  const applySvgPresetMutation = useApplySvgPresetMutation();
  const [isAdjustingView, setIsAdjustingView] = useState(false);
  const [outOfViewShapeIds, setOutOfViewShapeIds] = useState<string[]>([]);
  const handleViewBoxChange = useCallback(
    (nextViewBox: string) => {
      onChange((currentExercise) => setViewBox(currentExercise, nextViewBox));
    },
    [onChange],
  );

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
          {!exercise.svgAssetFilename && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
                <Map aria-hidden="true" className="h-4 w-4" />
                Choose diagram
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Map aria-hidden="true" className="h-4 w-4" />
                    Presets
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {regionPickerSvgPresets.map((preset) => (
                      <DropdownMenuItem
                        disabled={applySvgPresetMutation.isPending}
                        key={preset.id}
                        onClick={() =>
                          applySvgPresetMutation.mutate(
                            { courseId, presetId: preset.id },
                            {
                              onSuccess: (result) => {
                                onChange((currentExercise) =>
                                  setSvgAsset(currentExercise, result.path),
                                );
                              },
                            },
                          )
                        }
                      >
                        {preset.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
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
                >
                  <Upload aria-hidden="true" className="h-4 w-4" />
                  Upload
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {exercise.svgAssetFilename && (
            <>
              <CardDescription>{exercise.svgAssetFilename}</CardDescription>
              <Button
                onClick={() => setIsAdjustingView((current) => !current)}
                size="sm"
                variant={isAdjustingView ? "default" : "outline"}
              >
                <ZoomIn aria-hidden="true" className="h-4 w-4" />
                {isAdjustingView ? "Done" : "Adjust view"}
              </Button>
              {isAdjustingView && exercise.viewBox && (
                <Button
                  onClick={() =>
                    onChange((currentExercise) => setViewBox(currentExercise, undefined))
                  }
                  size="sm"
                  variant="ghost"
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Reset view
                </Button>
              )}
              <Button
                onClick={() => {
                  setIsAdjustingView(false);
                  onChange((currentExercise) => clearSvgAsset(currentExercise));
                }}
                size="sm"
                variant="ghost"
              >
                <X aria-hidden="true" className="h-4 w-4" />
                Clear diagram
              </Button>
            </>
          )}
        </div>
        {exercise.svgAssetFilename && (
          <div>
            <Alert className="mb-2" variant="info">
              <Info aria-hidden="true" className="h-4 w-4 text-info" />
              <AlertDescription>
                {isAdjustingView
                  ? "Drag to pan, use the zoom buttons to crop. This is the crop students will see."
                  : "Click the regions students should mark as correct."}
              </AlertDescription>
            </Alert>
            <RegionPickerCanvas
              isAdjustingView={isAdjustingView}
              onSelectedShapesOutOfView={setOutOfViewShapeIds}
              onToggleShape={(shapeId) =>
                onChange((currentExercise) => toggleCorrectShape(currentExercise, shapeId))
              }
              onViewBoxChange={handleViewBoxChange}
              selectedShapeIds={exercise.correctShapeIds}
              svgUrl={matkoAssetUrl(courseId, exercise.svgAssetFilename)}
              viewBox={exercise.viewBox}
            />
            {outOfViewShapeIds.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="warning">Warning</Badge>
                <CardDescription>
                  These correct regions are outside the current view:{" "}
                  {outOfViewShapeIds.join(", ")}
                </CardDescription>
              </div>
            )}
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
