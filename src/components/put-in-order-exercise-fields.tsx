import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
import {
  addItem,
  MAX_ORDER_ITEMS,
  MIN_ORDER_ITEMS,
  moveItem,
  removeItem,
  setListen,
  updateItemImage,
  updateItemText,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/put-in-order-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import { ReadAloudButton } from "@/components/read-aloud-button";
import type { PutInOrderTestExercise } from "@/components/test-editor-prototype-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceCardImage, ChoiceCardMarker } from "@/components/ui/choice-card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { matkoAssetUrl } from "@/lib/course-assets";
import { useUploadCourseAssetMutation } from "@/lib/course-queries";

// The teacher's side of Put in order (SLJ-177): the instruction, then the
// items in the right order (the arrows move one), each text or a picture
// (whose text says what it shows). "Heard, not shown" turns them into
// sounds, read in the exercise's read-aloud language.
export function PutInOrderExerciseFields({
  courseId,
  exercise,
  locale,
  moreOptions,
  onChange,
}: FieldsComponentProps<PutInOrderTestExercise>) {
  const { t } = useTranslation();
  const upload = useUploadCourseAssetMutation();
  const content = exercise.locales[locale] ?? { hint: "", items: [], prompt: "" };
  const validation = validate(exercise, locale);
  const fieldId = (name: string) => `put-in-order-${name}-${exercise.id}-${locale}`;
  const count = exercise.images.length;

  function addPicture(index: number) {
    upload.mutate(
      { courseId, kind: "image" },
      { onSuccess: (result) => result && onChange((current) => updateItemImage(current, index, result.path)) },
    );
  }

  return (
    <>
      <Field>
        <FieldLabel htmlFor={fieldId("prompt")}>{t("listenChoose.promptLabel")}</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={fieldId("prompt")}
          onChange={(event) => onChange((current) => updatePrompt(current, locale, event.target.value))}
          placeholder={t("putInOrder.promptPlaceholder")}
          rows={2}
          value={content.prompt}
        />
      </Field>

      <Field>
        <FieldLabel>{t("putInOrder.itemsLabel")}</FieldLabel>
        <FieldDescription>{t("putInOrder.itemsHelp")}</FieldDescription>
        <div className="flex flex-col gap-3">
          {Array.from({ length: count }, (_unused, index) => {
            const image = exercise.images[index];
            const text = content.items[index] ?? "";
            const name = t("putInOrder.item", { number: index + 1 });
            return (
              <div className="flex items-center gap-2" data-testid="put-in-order-row" key={index}>
                <ChoiceCardMarker>{index + 1}.</ChoiceCardMarker>
                {exercise.listen ? (
                  <ReadAloudButton language={exercise.speech?.lang} text={text} />
                ) : image ? (
                  <div className="size-12 shrink-0">
                    <ChoiceCardImage alt={text} src={matkoAssetUrl(courseId, image)} />
                  </div>
                ) : (
                  <Button
                    aria-label={t("matchPairs.addPicture", { item: name })}
                    disabled={upload.isPending}
                    onClick={() => addPicture(index)}
                    shape="circle"
                    size="icon"
                    title={t("matchPairs.addPicture", { item: name })}
                    type="button"
                    variant="secondary"
                  >
                    <ImagePlus aria-hidden="true" />
                  </Button>
                )}
                <Input
                  aria-label={name}
                  className="min-w-0"
                  onChange={(event) => onChange((current) => updateItemText(current, locale, index, event.target.value))}
                  placeholder={
                    exercise.listen
                      ? t("matchPairs.heardPlaceholder")
                      : image
                        ? t("listenChoose.optionAltPlaceholder")
                        : t("matchPairs.textPlaceholder")
                  }
                  value={text}
                />
                {image && !exercise.listen && (
                  <Button
                    aria-label={t("listenChoose.removePicture")}
                    onClick={() => onChange((current) => updateItemImage(current, index, null))}
                    size="icon-sm"
                    title={t("listenChoose.removePicture")}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
                <Button
                  aria-label={t("putInOrder.moveUp", { number: index + 1 })}
                  disabled={index === 0}
                  onClick={() => onChange((current) => moveItem(current, index, -1))}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  aria-label={t("putInOrder.moveDown", { number: index + 1 })}
                  disabled={index === count - 1}
                  onClick={() => onChange((current) => moveItem(current, index, 1))}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  aria-label={t("putInOrder.removeItem", { number: index + 1 })}
                  disabled={count <= MIN_ORDER_ITEMS}
                  onClick={() => onChange((current) => removeItem(current, index))}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            );
          })}
        </div>
        <div>
          <Button
            disabled={count >= MAX_ORDER_ITEMS}
            onClick={() => onChange((current) => addItem(current))}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Plus aria-hidden="true" />
            {t("putInOrder.addItem")}
          </Button>
        </div>
        <Label>
          <Checkbox
            checked={exercise.listen}
            data-testid="put-in-order-listen"
            onCheckedChange={(checked) => onChange((current) => setListen(current, checked === true, locale))}
          />
          {t("putInOrder.listen")}
        </Label>
        {validation.status !== "idle" && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={validation.status === "valid" ? "success" : "warning"}>
              {t(validation.status === "valid" ? "listenChoose.valid" : "listenChoose.invalid")}
            </Badge>
            <CardDescription>{validation.message}</CardDescription>
          </div>
        )}
      </Field>
      {moreOptions && <ExerciseMoreOptions defaultOpen={hasMoreOptionsSet(exercise)}>{moreOptions}</ExerciseMoreOptions>}
    </>
  );
}
