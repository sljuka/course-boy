import { RotateCcw, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { createExercise, fromShared, toShared, validate } from "@/components/exercise-kinds/put-in-order-logic";
import type {
  AnswerComponentProps,
  ExerciseKindEditor,
  PrintAnswerComponentProps,
} from "@/components/exercise-kinds/types";
import { PutInOrderExerciseFields } from "@/components/put-in-order-exercise-fields";
import { SortableCards } from "@/components/put-in-order-sortable";
import type { PutInOrderTestExercise } from "@/components/test-editor-prototype-types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChoiceCard, ChoiceCardAnswerBox, ChoiceCardBadge, ChoiceCardGrid, ChoiceCardImage } from "@/components/ui/choice-card";
import type { PutInOrderCourseExercise, SharedPutInOrderTestExerciseDefinition } from "@/lib/course-package";
import { decodePutInOrderAnswer, encodePutInOrderAnswer } from "@/lib/exercise-kinds/put-in-order";
import { exerciseSpeechLanguage } from "@/lib/exercise-speech";
import { useReadAloud } from "@/lib/speech-preference";

const LETTERS = "ABCDEFGHIJ";

// Put in order (SLJ-177): tap the card that comes first, then the next…;
// each gets its number and moves to its place, so the student sees the order
// they built. Tapping a numbered card takes its number off (the later ones
// move up). Or drag a card to where it belongs (SLJ-180): that fixes the order
// of all the cards as shown. Heard items (`listen`) are cards named A, B, …
// with a 🔊 above each, so listening never numbers a card.
function AnswerComponent({ exercise, index, instance, onAnswerChange, parts, value }: AnswerComponentProps<PutInOrderCourseExercise>) {
  const { t } = useTranslation();
  const read = useReadAloud(exercise.listen ? exerciseSpeechLanguage(exercise) : undefined);
  if (instance.kind !== "put-in-order") return null;

  const sequence = decodePutInOrderAnswer(value, exercise.items.length);
  const untapped = instance.order.filter((itemIndex) => !sequence.includes(itemIndex));
  const tap = (itemIndex: number) =>
    onAnswerChange(
      encodePutInOrderAnswer(
        sequence.includes(itemIndex) ? sequence.filter((tapped) => tapped !== itemIndex) : [...sequence, itemIndex],
      ),
    );
  // A heard card's name stays the same wherever it moves.
  const letterOf = (itemIndex: number) => LETTERS[instance.order.indexOf(itemIndex)] ?? "";

  function card(itemIndex: number, wasDropped: () => boolean) {
    const place = sequence.indexOf(itemIndex);
    const text = exercise.items[itemIndex] ?? "";
    const image = exercise.imageUrls[itemIndex];
    const label = exercise.listen ? t("putInOrder.heardItem", { letter: letterOf(itemIndex) }) : text;
    const isWrong = place !== -1 && parts?.[itemIndex] === false;
    const choiceCard = (
      <ChoiceCard
        aria-invalid={isWrong || undefined}
        aria-label={place === -1 ? label : t("putInOrder.placedLabel", { label, number: place + 1 })}
        aria-pressed={place !== -1}
        // Fills its place in the grid, as wide and as tall as the row (a
        // button is only as big as its text otherwise), with room on both
        // sides for the number and the grip.
        className={image && !exercise.listen ? "w-full flex-1" : "w-full flex-1 px-10"}
        data-testid="put-in-order-item"
        id={`course-exercise-answer-${index}-${itemIndex}`}
        kind={image && !exercise.listen ? "picture" : "text"}
        onClick={() => {
          if (!wasDropped()) tap(itemIndex);
        }}
        picked={place !== -1 && !isWrong}
        wrong={isWrong}
      >
        {place !== -1 && (
          <ChoiceCardBadge size="lg" tone="primary">
            {place + 1}
          </ChoiceCardBadge>
        )}
        {exercise.listen ? letterOf(itemIndex) : image ? <ChoiceCardImage alt={text} src={image} /> : text}
      </ChoiceCard>
    );
    if (!exercise.listen) return choiceCard;
    return (
      <div className="flex flex-1 flex-col gap-2">
        <Button
          aria-label={t("putInOrder.listenTo", { letter: letterOf(itemIndex) })}
          data-testid="put-in-order-play"
          disabled={!read}
          onClick={() => read?.(text)}
          type="button"
          variant="secondary"
        >
          <Volume2 aria-hidden="true" />
          {letterOf(itemIndex)}
        </Button>
        {choiceCard}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 print:hidden">
      {exercise.listen && !read && (
        <Alert data-testid="put-in-order-no-voice" variant="warning">
          <AlertDescription>{t("listenChoose.noVoice")}</AlertDescription>
        </Alert>
      )}
      <ChoiceCardGrid aria-label={t("putInOrder.answerLabel")} role="group">
        <SortableCards
          labelOf={(itemIndex) => (exercise.listen ? t("putInOrder.heardItem", { letter: letterOf(itemIndex) }) : (exercise.items[itemIndex] ?? ""))}
          onReorder={(order) => onAnswerChange(encodePutInOrderAnswer(order))}
          order={[...sequence, ...untapped]}
        >
          {card}
        </SortableCards>
      </ChoiceCardGrid>
      {sequence.length > 0 && (
        <div>
          <Button data-testid="put-in-order-reset" onClick={() => onAnswerChange(encodePutInOrderAnswer([]))} size="sm" type="button" variant="ghost">
            <RotateCcw aria-hidden="true" />
            {t("matchPairs.reset")}
          </Button>
        </div>
      )}
    </div>
  );
}

// On paper: the cards out of order (shifted by one, the same on every
// sheet), each with a box for its number. Heard items are said by the
// teacher, by letter.
function PrintAnswerComponent({ exercise }: PrintAnswerComponentProps<PutInOrderCourseExercise>) {
  const { t } = useTranslation();
  const count = exercise.items.length;
  const order = exercise.items.map((_item, place) => (place + 1) % count);
  return (
    <div className="hidden flex-col gap-2 print:flex">
      <p className="text-sm">{t(exercise.listen ? "putInOrder.printNoteHeard" : "putInOrder.printNote")}</p>
      <ChoiceCardGrid>
        {order.map((itemIndex, place) => {
          const text = exercise.items[itemIndex] ?? "";
          const image = exercise.imageUrls[itemIndex];
          return (
            <div className="flex flex-col items-center gap-2" key={itemIndex}>
              <ChoiceCard aria-hidden="true" className="w-full" kind={image && !exercise.listen ? "picture" : "text"} tabIndex={-1}>
                {exercise.listen ? LETTERS[place] : image ? <ChoiceCardImage alt={text} src={image} /> : text}
              </ChoiceCard>
              <ChoiceCardAnswerBox />
            </div>
          );
        })}
      </ChoiceCardGrid>
    </div>
  );
}

export const putInOrderExerciseEditor: ExerciseKindEditor<
  PutInOrderTestExercise,
  SharedPutInOrderTestExerciseDefinition,
  PutInOrderCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: PutInOrderExerciseFields,
  PrintAnswerComponent,
  createExercise,
  description:
    "Cards (words, sentences, pictures or sounds heard) shown shuffled: the student taps them in the right order, numbering them 1, 2, 3… Each card in its place counts.",
  fromShared,
  kind: "put-in-order",
  label: "Put in order",
  toShared,
  validate,
};
