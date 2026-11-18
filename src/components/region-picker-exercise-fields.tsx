import { useCallback, useRef, useState } from "react";
import { Info, Map, RotateCcw, Upload, X, ZoomIn } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { ColorPickerField } from "@/components/color-picker-field";
import { ColorSwatch } from "@/components/ui/color-swatch";
import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
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
import { STRONG_COLOR_OPTIONS } from "@/lib/color-options";
import { regionPickerSvgPresets } from "@/lib/region-picker-svg-presets";
import type { RegionPickerTestExercise } from "@/components/test-editor-prototype-types";
import {
  clearSvgAsset,
  setMarkerColor,
  setSvgAsset,
  setViewBox,
  toggleCorrectShape,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/region-picker-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";

function RegionPickerMarkerColorField({
  onChange,
  value,
}: {
  onChange: (color: string) => void;
  value: string;
}) {
  const { t } = useTranslation();

  return (
    <ColorPickerField
      colorOptions={STRONG_COLOR_OPTIONS}
      onChange={onChange}
      trigger={<Button aria-label={t("regionEditor.picker.chooseColor")} className="h-8 w-8" size="icon" variant="ghost" />}
      value={value}
    >
      <ColorSwatch className="size-5" color={value} />
    </ColorPickerField>
  );
}

export function RegionPickerExerciseFields({
  courseId,
  exercise,
  locale,
  moreOptions,
  onChange,
}: FieldsComponentProps<RegionPickerTestExercise>) {
  const { t } = useTranslation();
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
        <FieldLabel htmlFor={`exercise-prompt-${exercise.id}-${locale}`}>{t("regionEditor.promptLabel")}</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-prompt-${exercise.id}-${locale}`}
          onChange={(event) =>
            onChange((currentExercise) => updatePrompt(currentExercise, locale, event.target.value))
          }
          placeholder={t("regionEditor.picker.promptPlaceholder")}
          ref={promptRef}
          rows={2}
          value={prompt}
        />
      </Field>

      <Field>
        <FieldLabel>{t("regionEditor.diagramLabel")}</FieldLabel>
        <div className="flex items-center gap-2">
          {!exercise.svgAssetFilename && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
                <Map aria-hidden="true" className="h-4 w-4" />
                {t("regionEditor.chooseDiagram")}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Map aria-hidden="true" className="h-4 w-4" />
                    {t("regionEditor.presets")}
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
                        {/* Preset names are app-defined, so they are translated by id;
                            a preset without a key yet falls back to its English label. */}
                        {t(`regionEditor.presetNames.${preset.id}`, { defaultValue: preset.label })}
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
                  {t("regionEditor.upload")}
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
                {isAdjustingView ? t("regionEditor.done") : t("regionEditor.adjustView")}
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
                  {t("regionEditor.resetView")}
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
                {t("regionEditor.clearDiagram")}
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
                  ? t("regionEditor.adjustViewHelp")
                  : t("regionEditor.picker.help")}
              </AlertDescription>
            </Alert>
            <RegionPickerCanvas
              isAdjustingView={isAdjustingView}
              onSelectedShapesOutOfView={setOutOfViewShapeIds}
              onToggleShape={(shapeId) =>
                onChange((currentExercise) => toggleCorrectShape(currentExercise, shapeId))
              }
              onViewBoxChange={handleViewBoxChange}
              selectedFillColor={exercise.markerColor}
              selectedShapeIds={exercise.correctShapeIds}
              svgUrl={matkoAssetUrl(courseId, exercise.svgAssetFilename)}
              viewBox={exercise.viewBox}
            />
            {outOfViewShapeIds.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="warning">{t("regionEditor.validation.warning")}</Badge>
                <CardDescription>
                  {t("regionEditor.picker.outOfView", { regions: outOfViewShapeIds.join(", ") })}
                </CardDescription>
              </div>
            )}
          </div>
        )}
        {validation.status !== "idle" && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={validation.status === "valid" ? "success" : "warning"}>
              {t(`regionEditor.validation.${validation.status}`)}
            </Badge>
            <CardDescription>
              {t(validation.message.key, validation.message.values)}
            </CardDescription>
          </div>
        )}
      </Field>

      <ExerciseMoreOptions defaultOpen={hasMoreOptionsSet(exercise)}>
          <Field>
            <div className="flex items-center gap-2">
              <FieldLabel>{t("regionEditor.picker.markerColor")}</FieldLabel>
              <RegionPickerMarkerColorField
                onChange={(color) =>
                  onChange((currentExercise) => setMarkerColor(currentExercise, color))
                }
                value={exercise.markerColor}
              />
            </div>
          </Field>
          {moreOptions}
      </ExerciseMoreOptions>
    </>
  );
}
