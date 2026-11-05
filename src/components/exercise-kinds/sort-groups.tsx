import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCcw, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { createExercise, fromShared, toShared, validate } from "@/components/exercise-kinds/sort-groups-logic";
import type {
  AnswerComponentProps,
  ExerciseKindEditor,
  PrintAnswerComponentProps,
} from "@/components/exercise-kinds/types";
import { SortGroupsExerciseFields } from "@/components/sort-groups-exercise-fields";
import type { SortGroupsTestExercise } from "@/components/test-editor-prototype-types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ChoiceBox,
  ChoiceBoxes,
  ChoiceBoxTitle,
  ChoiceCard,
  ChoiceCardAnswerBox,
  ChoiceCardGrid,
  ChoiceCardImage,
  ChoiceCardMarker,
} from "@/components/ui/choice-card";
import type { SharedSortGroupsTestExerciseDefinition, SortGroupsCourseExercise } from "@/lib/course-package";
import { decodeSortGroupsAnswer, encodeSortGroupsAnswer } from "@/lib/exercise-kinds/sort-groups";
import { exerciseSpeechLanguage } from "@/lib/exercise-speech";
import { useReadAloud } from "@/lib/speech-preference";

const LETTERS = "ABCD";
// How far the pointer moves before a press becomes a drag (a tap otherwise).
const DRAG_THRESHOLD = 8;
const SMALL_GRID = "grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))]";

type Drag = { card: number; dx: number; dy: number; moved: boolean; startX: number; startY: number };

// Sort into groups (SLJ-178): tap a card in the pile, then a group (or drag
// the card onto it). Tapping a card in a group sends it back to the pile.
// Keyboard: focus a card, press a group's number. Heard cards (`listen`)
// show 🔊 and play when tapped.
function AnswerComponent({ exercise, index, instance, onAnswerChange, parts, value }: AnswerComponentProps<SortGroupsCourseExercise>) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  // When a drag ended: the click the browser sends right after isn't a tap.
  const droppedAt = useRef(0);
  const read = useReadAloud(exercise.listen ? exerciseSpeechLanguage(exercise) : undefined);
  if (instance.kind !== "sort-groups") return null;
  const { cardOrder } = instance;

  const placed = decodeSortGroupsAnswer(value, exercise.cards.length, exercise.groups.length);
  const place = (card: number, group: number | null) => {
    onAnswerChange(encodeSortGroupsAnswer(placed.map((current, cardIndex) => (cardIndex === card ? group : current))));
    setSelected(null);
  };
  const pile = cardOrder.filter((card) => placed[card] === null);

  function tapCard(card: number) {
    if (Date.now() - droppedAt.current < 300) return;
    if (exercise.listen) read?.(exercise.cards[card] ?? "");
    if (placed[card] !== null) {
      // Heard cards play when tapped in a group too; a second tap sends them back.
      if (!exercise.listen || selected === card) place(card, null);
      else setSelected(card);
      return;
    }
    setSelected(selected === card ? null : card);
  }

  function tapGroup(group: number) {
    if (selected !== null) place(selected, group);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, card: number) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ card, dx: 0, dy: 0, moved: false, startX: event.clientX, startY: event.clientY });
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setDrag({ ...drag, dx, dy, moved: drag.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD });
  }

  // Dropped on a group: it goes there; anywhere else: back to the pile.
  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    if (drag.moved) {
      const target = document
        .elementsFromPoint(event.clientX, event.clientY)
        .map((element) => element.closest<HTMLElement>("[data-sort-group]"))
        .find(Boolean);
      const group = target ? Number(target.dataset.sortGroup) : null;
      place(drag.card, group);
      droppedAt.current = Date.now();
    }
    setDrag(null);
  }

  function card(cardIndex: number) {
    const text = exercise.cards[cardIndex] ?? "";
    const image = exercise.cardImageUrls[cardIndex];
    const group = placed[cardIndex];
    const isWrong = group !== null && parts?.[cardIndex] === false;
    const isDragging = drag?.card === cardIndex && drag.moved;
    const label = exercise.listen ? t("sortGroups.heardCard", { number: cardOrder.indexOf(cardIndex) + 1 }) : text;
    return (
      <ChoiceCard
        aria-invalid={isWrong || undefined}
        aria-label={group === null ? label : t("sortGroups.placedLabel", { group: exercise.groups[group], label })}
        aria-pressed={selected === cardIndex}
        data-testid="sort-groups-card"
        dragging={isDragging}
        id={`course-exercise-answer-${index}-${cardIndex}`}
        key={cardIndex}
        kind={image || exercise.listen ? "pair" : "pairText"}
        movable
        onClick={(event) => {
          // A card in a group is tapped for itself, not for its group.
          event.stopPropagation();
          tapCard(cardIndex);
        }}
        onKeyDown={(event) => {
          const number = Number(event.key);
          if (Number.isInteger(number) && number >= 1 && number <= exercise.groups.length) {
            event.preventDefault();
            place(cardIndex, number - 1);
          }
        }}
        onPointerCancel={() => setDrag(null)}
        onPointerDown={(event) => onPointerDown(event, cardIndex)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        picked={selected === cardIndex}
        style={isDragging ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
        wrong={isWrong}
      >
        {exercise.listen ? <Volume2 aria-hidden="true" className="size-7" /> : image ? <ChoiceCardImage alt={text} src={image} /> : text}
      </ChoiceCard>
    );
  }

  return (
    <div className="flex flex-col gap-4 print:hidden">
      {exercise.listen && !read && (
        <Alert data-testid="sort-groups-no-voice" variant="warning">
          <AlertDescription>{t("listenChoose.noVoice")}</AlertDescription>
        </Alert>
      )}
      <ChoiceBoxes>
        {exercise.groups.map((name, group) => (
          <ChoiceBox
            data-sort-group={group}
            data-testid="sort-groups-group"
            key={group}
            onClick={() => tapGroup(group)}
            ready={selected !== null || Boolean(drag?.moved)}
          >
            <ChoiceBoxTitle
              aria-label={t("sortGroups.putIn", { group: name, number: group + 1 })}
              onClick={(event) => {
                event.stopPropagation();
                tapGroup(group);
              }}
            >
              <ChoiceCardMarker>{group + 1}.</ChoiceCardMarker>
              {name}
            </ChoiceBoxTitle>
            <ChoiceCardGrid className={SMALL_GRID}>
              {cardOrder.filter((cardIndex) => placed[cardIndex] === group).map(card)}
            </ChoiceCardGrid>
          </ChoiceBox>
        ))}
      </ChoiceBoxes>
      {pile.length > 0 && (
        <ChoiceCardGrid aria-label={t("sortGroups.pile")} className={SMALL_GRID} data-testid="sort-groups-pile" role="group">
          {pile.map(card)}
        </ChoiceCardGrid>
      )}
      {pile.length < exercise.cards.length && (
        <div>
          <Button
            data-testid="sort-groups-reset"
            onClick={() => {
              setSelected(null);
              onAnswerChange(encodeSortGroupsAnswer(placed.map(() => null)));
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <RotateCcw aria-hidden="true" />
            {t("matchPairs.reset")}
          </Button>
        </div>
      )}
    </div>
  );
}

// On paper: the groups lettered, and the cards each with a box for its
// group's letter. Heard cards are said by the teacher, by number.
function PrintAnswerComponent({ exercise }: PrintAnswerComponentProps<SortGroupsCourseExercise>) {
  const { t } = useTranslation();
  return (
    <div className="hidden flex-col gap-3 print:flex">
      <p className="text-sm">{t(exercise.listen ? "sortGroups.printNoteHeard" : "sortGroups.printNote")}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {exercise.groups.map((name, group) => (
          <div className="flex items-center gap-1" key={group}>
            <ChoiceCardMarker>{LETTERS[group]}.</ChoiceCardMarker>
            {name}
          </div>
        ))}
      </div>
      <ChoiceCardGrid className={SMALL_GRID}>
        {exercise.cards.map((text, cardIndex) => {
          const image = exercise.cardImageUrls[cardIndex];
          return (
            <div className="flex flex-col items-center gap-2" key={cardIndex}>
              <ChoiceCard aria-hidden="true" className="w-full" kind={image && !exercise.listen ? "pair" : "pairText"} tabIndex={-1}>
                {exercise.listen ? cardIndex + 1 : image ? <ChoiceCardImage alt={text} src={image} /> : text}
              </ChoiceCard>
              <ChoiceCardAnswerBox />
            </div>
          );
        })}
      </ChoiceCardGrid>
    </div>
  );
}

export const sortGroupsExerciseEditor: ExerciseKindEditor<
  SortGroupsTestExercise,
  SharedSortGroupsTestExerciseDefinition,
  SortGroupsCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: SortGroupsExerciseFields,
  PrintAnswerComponent,
  createExercise,
  description:
    "Two to four named groups and a pile of cards (words, pictures or sounds heard): the student taps or drags each card into its group. Each card in its group counts; or no right answer, for \"I like / I don't like\".",
  fromShared,
  kind: "sort-groups",
  label: "Sort into groups",
  toShared,
  validate,
};
