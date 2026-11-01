import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
import {
  addArea,
  areaStyle,
  isSmallArea,
  removeArea,
  setImage,
  updateArea,
  updateAreaLabel,
  updateImageAlt,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/find-in-picture-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import type { FindInPictureTestExercise } from "@/components/test-editor-prototype-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PictureArea, PictureAreaNumber, PictureStage, PictureStageImage } from "@/components/ui/picture-areas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PictureArea as Area } from "@/lib/course-package";
import { matkoAssetUrl } from "@/lib/course-assets";
import { useUploadCourseAssetMutation } from "@/lib/course-queries";

type Point = { x: number; y: number };

const SHAPES: Area["shape"][] = ["rect", "ellipse"];

// The teacher's side of Find in the picture (SLJ-179): the picture and its
// alt text, the instruction, and the areas: drag across the picture to draw
// one, then name it, choose its shape and mark whether it's right. Small
// areas are flagged: hard to tap on a phone.
export function FindInPictureExerciseFields({ courseId, exercise, locale, moreOptions, onChange }: FieldsComponentProps<FindInPictureTestExercise>) {
  const { t } = useTranslation();
  const upload = useUploadCourseAssetMutation();
  const [drawing, setDrawing] = useState<{ from: Point; to: Point } | null>(null);
  const content = exercise.locales[locale] ?? { areaLabels: [], hint: "", imageAlt: "", prompt: "" };
  const validation = validate(exercise, locale);
  const fieldId = (name: string) => `find-in-picture-${name}-${exercise.id}-${locale}`;

  function choosePicture() {
    upload.mutate({ courseId, kind: "image" }, { onSuccess: (result) => result && onChange((current) => setImage(current, result.path)) });
  }

  const pointOf = (event: ReactPointerEvent<HTMLDivElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  };

  return (
    <>
      <Field>
        <FieldLabel htmlFor={fieldId("prompt")}>{t("listenChoose.promptLabel")}</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={fieldId("prompt")}
          onChange={(event) => onChange((current) => updatePrompt(current, locale, event.target.value))}
          placeholder={t("findInPicture.promptPlaceholder")}
          rows={2}
          value={content.prompt}
        />
      </Field>

      <Field>
        <FieldLabel>{t("findInPicture.pictureLabel")}</FieldLabel>
        {exercise.imageAssetFilename ? (
          <>
            <FieldDescription>{t("findInPicture.drawHelp")}</FieldDescription>
            <PictureStage
              className="cursor-crosshair touch-none"
              data-testid="find-in-picture-editor-stage"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                const point = pointOf(event);
                setDrawing({ from: point, to: point });
              }}
              onPointerMove={(event) => drawing && setDrawing({ ...drawing, to: pointOf(event) })}
              onPointerUp={(event) => {
                if (!drawing) return;
                const to = pointOf(event);
                setDrawing(null);
                // A plain click draws nothing.
                if (Math.abs(to.x - drawing.from.x) < 0.01 || Math.abs(to.y - drawing.from.y) < 0.01) return;
                onChange((current) => addArea(current, drawing.from, to));
              }}
            >
              <PictureStageImage alt={content.imageAlt} src={matkoAssetUrl(courseId, exercise.imageAssetFilename)} />
              {exercise.areas.map((area, index) => (
                <PictureArea key={area.id} shape={area.shape} style={areaStyle(area)} tone={area.correct ? "editorRight" : "editor"}>
                  <PictureAreaNumber className="m-1">{index + 1}</PictureAreaNumber>
                </PictureArea>
              ))}
              {drawing && (
                <PictureArea
                  style={areaStyle({
                    correct: false,
                    height: Math.abs(drawing.to.y - drawing.from.y),
                    id: "drawing",
                    shape: "rect",
                    width: Math.abs(drawing.to.x - drawing.from.x),
                    x: Math.min(drawing.from.x, drawing.to.x),
                    y: Math.min(drawing.from.y, drawing.to.y),
                  })}
                  tone="editor"
                />
              )}
            </PictureStage>
            <div>
              <Button disabled={upload.isPending} onClick={choosePicture} size="sm" type="button" variant="ghost">
                <ImagePlus aria-hidden="true" />
                {t("findInPicture.replacePicture")}
              </Button>
            </div>
          </>
        ) : (
          <div>
            <Button data-testid="find-in-picture-add-picture" disabled={upload.isPending} onClick={choosePicture} type="button" variant="secondary">
              <ImagePlus aria-hidden="true" />
              {t("findInPicture.addPicture")}
            </Button>
          </div>
        )}
      </Field>

      {exercise.imageAssetFilename && (
        <Field>
          <FieldLabel htmlFor={fieldId("alt")}>{t("findInPicture.altLabel")}</FieldLabel>
          <Input
            id={fieldId("alt")}
            onChange={(event) => onChange((current) => updateImageAlt(current, locale, event.target.value))}
            placeholder={t("findInPicture.altPlaceholder")}
            value={content.imageAlt}
          />
        </Field>
      )}

      {exercise.areas.length > 0 && (
        <Field>
          <FieldLabel>{t("findInPicture.areasLabel")}</FieldLabel>
          <div className="flex flex-col gap-2">
            {exercise.areas.map((area, index) => (
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap" data-testid="find-in-picture-area-row" key={area.id}>
                <PictureAreaNumber>{index + 1}</PictureAreaNumber>
                <Input
                  aria-label={t("findInPicture.areaName", { number: index + 1 })}
                  className="min-w-0 flex-1"
                  onChange={(event) => onChange((current) => updateAreaLabel(current, locale, index, event.target.value))}
                  placeholder={t("findInPicture.areaNamePlaceholder")}
                  value={content.areaLabels[index] ?? ""}
                />
                <Select
                  onValueChange={(value) => value && onChange((current) => updateArea(current, index, { shape: value as Area["shape"] }))}
                  value={area.shape}
                >
                  <SelectTrigger aria-label={t("findInPicture.shape")} className="w-32 shrink-0">
                    <SelectValue>{(value: string) => t(`findInPicture.shapes.${value}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SHAPES.map((shape) => (
                      <SelectItem key={shape} value={shape}>
                        {t(`findInPicture.shapes.${shape}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>
                  <Checkbox
                    checked={area.correct}
                    onCheckedChange={(checked) => onChange((current) => updateArea(current, index, { correct: checked === true }))}
                  />
                  {t("findInPicture.right")}
                </Label>
                {isSmallArea(area) && <Badge variant="warning">{t("findInPicture.small")}</Badge>}
                <Button
                  aria-label={t("findInPicture.removeArea", { number: index + 1 })}
                  onClick={() => onChange((current) => removeArea(current, index))}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </Field>
      )}

      {validation.status !== "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={validation.status === "valid" ? "success" : "warning"}>
            {t(validation.status === "valid" ? "listenChoose.valid" : "listenChoose.invalid")}
          </Badge>
          <CardDescription>{validation.message}</CardDescription>
        </div>
      )}
      {moreOptions && <ExerciseMoreOptions defaultOpen={hasMoreOptionsSet(exercise)}>{moreOptions}</ExerciseMoreOptions>}
    </>
  );
}
