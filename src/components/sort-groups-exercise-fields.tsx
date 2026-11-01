import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
import {
  addCard,
  addGroup,
  MAX_CARDS,
  MAX_GROUPS,
  MIN_CARDS,
  MIN_GROUPS,
  removeCard,
  removeGroup,
  setListen,
  setNoRightAnswer,
  updateCardGroup,
  updateCardImage,
  updateCardText,
  updateGroupName,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/sort-groups-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import { ReadAloudButton } from "@/components/read-aloud-button";
import type { SortGroupsTestExercise } from "@/components/test-editor-prototype-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceCardImage, ChoiceCardMarker } from "@/components/ui/choice-card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { matkoAssetUrl } from "@/lib/course-assets";
import { useUploadCourseAssetMutation } from "@/lib/course-queries";

// The teacher's side of Sort into groups (SLJ-178): the instruction, the
// groups' names, then the cards, each with the group it belongs in (text or
// a picture, whose text says what it shows). "Heard, not shown" makes the
// cards sounds; "No right answer" makes it an activity.
export function SortGroupsExerciseFields({
  courseId,
  exercise,
  locale,
  moreOptions,
  onChange,
}: FieldsComponentProps<SortGroupsTestExercise>) {
  const { t } = useTranslation();
  const upload = useUploadCourseAssetMutation();
  const content = exercise.locales[locale] ?? { cards: [], groups: [], hint: "", prompt: "" };
  const validation = validate(exercise, locale);
  const fieldId = (name: string) => `sort-groups-${name}-${exercise.id}-${locale}`;
  const groupName = (group: number) => content.groups[group]?.trim() || t("sortGroups.group", { number: group + 1 });

  function addPicture(index: number) {
    upload.mutate(
      { courseId, kind: "image" },
      { onSuccess: (result) => result && onChange((current) => updateCardImage(current, index, result.path)) },
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
          placeholder={t("sortGroups.promptPlaceholder")}
          rows={2}
          value={content.prompt}
        />
      </Field>

      <Field>
        <FieldLabel>{t("sortGroups.groupsLabel")}</FieldLabel>
        <div className="flex flex-col gap-2">
          {content.groups.map((name, group) => (
            <div className="flex items-center gap-2" data-testid="sort-groups-group-row" key={group}>
              <ChoiceCardMarker>{group + 1}.</ChoiceCardMarker>
              <Input
                aria-label={t("sortGroups.group", { number: group + 1 })}
                onChange={(event) => onChange((current) => updateGroupName(current, locale, group, event.target.value))}
                placeholder={t("sortGroups.groupPlaceholder")}
                value={name}
              />
              <Button
                aria-label={t("sortGroups.removeGroup", { number: group + 1 })}
                disabled={content.groups.length <= MIN_GROUPS}
                onClick={() => onChange((current) => removeGroup(current, group))}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
        <div>
          <Button
            disabled={content.groups.length >= MAX_GROUPS}
            onClick={() => onChange((current) => addGroup(current))}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Plus aria-hidden="true" />
            {t("sortGroups.addGroup")}
          </Button>
        </div>
      </Field>

      <Field>
        <FieldLabel>{t("sortGroups.cardsLabel")}</FieldLabel>
        <FieldDescription>{t("sortGroups.cardsHelp")}</FieldDescription>
        <div className="flex flex-col gap-3">
          {exercise.cardGroups.map((group, index) => {
            const image = exercise.cardImages[index];
            const text = content.cards[index] ?? "";
            const name = t("sortGroups.card", { number: index + 1 });
            return (
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap" data-testid="sort-groups-card-row" key={index}>
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
                  className="min-w-0 flex-1"
                  onChange={(event) => onChange((current) => updateCardText(current, locale, index, event.target.value))}
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
                    onClick={() => onChange((current) => updateCardImage(current, index, null))}
                    size="icon-sm"
                    title={t("listenChoose.removePicture")}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
                <Select
                  onValueChange={(value) => value !== null && onChange((current) => updateCardGroup(current, index, Number(value)))}
                  value={String(group)}
                >
                  <SelectTrigger aria-label={t("sortGroups.cardGroup", { card: name })} className="w-40 shrink-0">
                    <SelectValue>{(value: string) => groupName(Number(value))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {content.groups.map((_name, groupIndex) => (
                      <SelectItem key={groupIndex} value={String(groupIndex)}>
                        {groupName(groupIndex)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  aria-label={t("sortGroups.removeCard", { number: index + 1 })}
                  disabled={exercise.cardGroups.length <= MIN_CARDS}
                  onClick={() => onChange((current) => removeCard(current, index))}
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
            disabled={exercise.cardGroups.length >= MAX_CARDS}
            onClick={() => onChange((current) => addCard(current))}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Plus aria-hidden="true" />
            {t("sortGroups.addCard")}
          </Button>
        </div>
        <Label>
          <Checkbox
            checked={exercise.listen}
            data-testid="sort-groups-listen"
            onCheckedChange={(checked) => onChange((current) => setListen(current, checked === true, locale))}
          />
          {t("sortGroups.listen")}
        </Label>
        <Label>
          <Checkbox
            checked={exercise.noRightAnswer}
            data-testid="sort-groups-no-right-answer"
            onCheckedChange={(checked) => onChange((current) => setNoRightAnswer(current, checked === true))}
          />
          {t("sortGroups.noRightAnswer")}
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
