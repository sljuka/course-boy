import { useEffect, useRef } from "react";
import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ListenChooseExerciseFields } from "@/components/listen-choose-exercise-fields";
import type { ListenChooseTestExercise } from "@/components/test-editor-prototype-types";
import type {
  AnswerComponentProps,
  ExerciseKindEditor,
  PrintAnswerComponentProps,
} from "@/components/exercise-kinds/types";
import { createExercise, fromShared, toShared, validate } from "@/components/exercise-kinds/listen-choose-logic";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChoiceCard, ChoiceCardGrid, ChoiceCardImage } from "@/components/ui/choice-card";
import type { ListenChooseCourseExercise, SharedListenChooseTestExerciseDefinition } from "@/lib/course-package";
import { decodeMultipleChoiceSelection, encodeMultipleChoiceSelection } from "@/lib/exercise-kinds/multiple-choice";
import { spokenLanguage } from "@/lib/exercise-speech";
import { useReadAloud } from "@/lib/speech-preference";

// Listen and choose (SLJ-175): a big button plays the hidden word or sentence
// (as often as wanted), and the options are pictures or text, picked by
// tapping. The spoken text is never on screen: hearing it is the exercise.
function AnswerComponent({
  autoPlay = false,
  exercise,
  index,
  instance,
  onAnswerChange,
  value,
}: AnswerComponentProps<ListenChooseCourseExercise>) {
  const { t } = useTranslation();
  const read = useReadAloud(spokenLanguage(exercise));
  // Shown on its own, it plays once by itself as soon as a voice is ready
  // (the voices can arrive a moment after the exercise); Listen plays it again.
  const playedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!autoPlay || !read || playedFor.current === exercise.id) return;
    playedFor.current = exercise.id;
    read(exercise.spoken);
  }, [autoPlay, exercise.id, exercise.spoken, read]);
  if (instance.kind !== "listen-choose") return null;

  const picked = decodeMultipleChoiceSelection(value);
  const isSingle = exercise.selectionMode === "single";
  const pick = (optionIndex: number) =>
    onAnswerChange(
      encodeMultipleChoiceSelection(
        isSingle
          ? [optionIndex]
          : picked.includes(optionIndex)
            ? picked.filter((pickedIndex) => pickedIndex !== optionIndex)
            : [...picked, optionIndex],
      ),
    );

  return (
    <div className="flex flex-col gap-4 print:hidden">
      {read ? (
        <div>
          <Button data-testid="listen-choose-play" onClick={() => read(exercise.spoken)} size="lg" type="button">
            <Volume2 aria-hidden="true" />
            {t("listenChoose.play")}
          </Button>
        </div>
      ) : (
        <Alert data-testid="listen-choose-no-voice" variant="warning">
          <AlertDescription>{t("listenChoose.noVoice")}</AlertDescription>
        </Alert>
      )}
      <ChoiceCardGrid aria-label={t("listenChoose.optionsLabel")} role={isSingle ? "radiogroup" : "group"}>
        {instance.optionOrder.map((optionIndex) => {
          const image = exercise.optionImageUrls[optionIndex];
          const text = exercise.options[optionIndex] ?? "";
          const isPicked = picked.includes(optionIndex);
          return (
            <ChoiceCard
              aria-checked={isPicked}
              aria-label={text}
              data-enter-submits=""
              data-testid="listen-choose-option"
              id={`course-exercise-answer-${index}-${optionIndex}`}
              key={optionIndex}
              kind={image ? "picture" : "text"}
              onClick={() => pick(optionIndex)}
              picked={isPicked}
              role={isSingle ? "radio" : "checkbox"}
            >
              {image ? <ChoiceCardImage alt={text} src={image} /> : text}
            </ChoiceCard>
          );
        })}
      </ChoiceCardGrid>
    </div>
  );
}

// On paper: the options to tick; the teacher says the word.
function PrintAnswerComponent({ exercise }: PrintAnswerComponentProps<ListenChooseCourseExercise>) {
  const { t } = useTranslation();
  return (
    <div className="hidden flex-col gap-2 print:flex">
      <p className="text-sm">{t("listenChoose.printNote")}</p>
      <ChoiceCardGrid>
        {exercise.options.map((text, optionIndex) => {
          const image = exercise.optionImageUrls[optionIndex];
          return (
            <ChoiceCard aria-hidden="true" key={optionIndex} kind={image ? "picture" : "text"} tabIndex={-1}>
              {image ? <ChoiceCardImage alt={text} src={image} /> : text}
            </ChoiceCard>
          );
        })}
      </ChoiceCardGrid>
    </div>
  );
}

export const listenChooseExerciseEditor: ExerciseKindEditor<
  ListenChooseTestExercise,
  SharedListenChooseTestExerciseDefinition,
  ListenChooseCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: ListenChooseExerciseFields,
  PrintAnswerComponent,
  createExercise,
  description:
    "The student hears a word or sentence (read aloud in the system's voice, never shown) and picks the matching picture or text. For young students and languages: \"Listen and choose\".",
  fromShared,
  kind: "listen-choose",
  label: "Listen and choose",
  toShared,
  validate,
};
