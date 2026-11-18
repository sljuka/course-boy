import { useCallback, useMemo, useRef, useState } from "react";
import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
import { Info, Map, RotateCcw, Upload, X, ZoomIn } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { ColorSwatch } from "@/components/ui/color-swatch";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RegionPickerCanvas } from "@/components/region-picker-canvas";
import { useApplySvgPresetMutation, useUploadCourseAssetMutation } from "@/lib/course-queries";
import { matkoAssetUrl } from "@/lib/course-assets";
import { regionPickerSvgPresets } from "@/lib/region-picker-svg-presets";
import type { RegionMarkerTestExercise } from "@/components/test-editor-prototype-types";
import {
  clearSvgAsset,
  setSvgAsset,
  setViewBox,
  toggleRegion,
  updatePrompt,
  updateRegionLabel,
  validate,
} from "@/components/exercise-kinds/region-marker-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";

export function RegionMarkerExerciseFields({
  courseId,
  exercise,
  locale,
  moreOptions,
  onChange,
}: FieldsComponentProps<RegionMarkerTestExercise>) {
  const { t } = useTranslation();
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const prompt = exercise.locales[locale]?.prompt ?? "";
  const validation = validate(exercise, locale);
  const uploadAssetMutation = useUploadCourseAssetMutation();
  const applySvgPresetMutation = useApplySvgPresetMutation();
  const [isAdjustingView, setIsAdjustingView] = useState(false);
  const handleViewBoxChange = useCallback(
    (nextViewBox: string) => {
      onChange((currentExercise) => setViewBox(currentExercise, nextViewBox));
    },
    [onChange],
  );
  // The teacher's own view always shows every marked region in its
  // permanently-assigned color — unlike the student's answer view, nothing
  // here is "unmarked yet".
  const shapeColors = useMemo(
    () => Object.fromEntries(exercise.regions.map((region) => [region.id, region.color])),
    [exercise.regions],
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
          placeholder={t("regionEditor.marker.promptPlaceholder")}
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
                  : t("regionEditor.marker.help")}
              </AlertDescription>
            </Alert>
            <RegionPickerCanvas
              isAdjustingView={isAdjustingView}
              onToggleShape={(shapeId) =>
                onChange((currentExercise) => toggleRegion(currentExercise, shapeId, locale))
              }
              onViewBoxChange={handleViewBoxChange}
              shapeColors={shapeColors}
              svgUrl={matkoAssetUrl(courseId, exercise.svgAssetFilename)}
              viewBox={exercise.viewBox}
            />
          </div>
        )}
        {exercise.regions.length > 0 && (
          <div className="flex flex-col gap-2">
            {exercise.regions.map((region) => (
              <div className="flex items-center gap-2" key={region.id}>
                <ColorSwatch color={region.color} />
                <CardDescription className="w-32 shrink-0 truncate">{region.id}</CardDescription>
                <Input
                  aria-label={t("regionEditor.marker.labelFor", { region: region.id })}
                  className="min-w-32 flex-1"
                  onChange={(event) =>
                    onChange((currentExercise) =>
                      updateRegionLabel(currentExercise, region.id, locale, event.target.value),
                    )
                  }
                  placeholder={t("regionEditor.marker.labelPlaceholder")}
                  value={region.labels[locale] ?? ""}
                />
                <button
                  aria-label={t("regionEditor.marker.removeRegion", { region: region.id })}
                  className="inline-flex items-center text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    onChange((currentExercise) => toggleRegion(currentExercise, region.id, locale))
                  }
                  type="button"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
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
      {moreOptions && (
        <ExerciseMoreOptions defaultOpen={hasMoreOptionsSet(exercise)}>{moreOptions}</ExerciseMoreOptions>
      )}
    </>
  );
}
