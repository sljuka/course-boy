import { useState } from "react";
import { RotateCcw, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { createExercise, fromShared, toShared, validate } from "@/components/exercise-kinds/match-pairs-logic";
import type {
  AnswerComponentProps,
  ExerciseKindEditor,
  PrintAnswerComponentProps,
} from "@/components/exercise-kinds/types";
import { MatchPairsExerciseFields } from "@/components/match-pairs-exercise-fields";
import type { MatchPairsTestExercise } from "@/components/test-editor-prototype-types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ChoiceCard,
  ChoiceCardAnswerBox,
  ChoiceCardBadge,
  ChoiceCardColumns,
  ChoiceCardImage,
  ChoiceCardMarker,
} from "@/components/ui/choice-card";
import type { MatchPairsCourseExercise, SharedMatchPairsTestExerciseDefinition } from "@/lib/course-package";
import { decodeMatchPairsAnswer, encodeMatchPairsAnswer } from "@/lib/exercise-kinds/match-pairs";
import { exerciseSpeechLanguage } from "@/lib/exercise-speech";
import { useReadAloud } from "@/lib/speech-preference";

type Side = "left" | "right";

const LETTERS = "ABCDEFGH";

// Match the pairs (SLJ-176): tap an item, then its partner in the other
// column (either side first). Paired items share a colour and a number;
// pairing an item again replaces its old pair. Heard items (`listenLeft`)
// are a 🔊 card: tapping it plays it and picks it.
function AnswerComponent({ exercise, index, instance, onAnswerChange, parts, value }: AnswerComponentProps<MatchPairsCourseExercise>) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<{ index: number; side: Side } | null>(null);
  const language = exerciseSpeechLanguage(exercise);
  const read = useReadAloud(exercise.listenLeft ? language : undefined);
  if (instance.kind !== "match-pairs") return null;

  const count = exercise.left.length;
  const pairs = decodeMatchPairsAnswer(value, count);
  const rowOfLeft = (leftIndex: number) => instance.leftOrder.indexOf(leftIndex);
  // Pairs are numbered 1, 2, … down the left column, counting only the paired items.
  const pairedRows = instance.leftOrder.filter((leftIndex) => pairs[leftIndex] !== null);
  const pairNumber = (leftIndex: number) => pairedRows.indexOf(leftIndex);
  const leftOfRight = (rightIndex: number) => pairs.findIndex((paired) => paired === rightIndex);

  function pair(leftIndex: number, rightIndex: number) {
    const next = pairs.map((paired) => (paired === rightIndex ? null : paired));
    next[leftIndex] = rightIndex;
    onAnswerChange(encodeMatchPairsAnswer(next));
    setSelected(null);
  }

  function tap(side: Side, itemIndex: number) {
    if (side === "left" && exercise.listenLeft) read?.(exercise.left[itemIndex] ?? "");
    if (selected && selected.side !== side) {
      if (side === "left") pair(itemIndex, selected.index);
      else pair(selected.index, itemIndex);
      return;
    }
    setSelected(selected?.side === side && selected.index === itemIndex ? null : { index: itemIndex, side });
  }

  function item(side: Side, itemIndex: number) {
    const leftIndex = side === "left" ? itemIndex : leftOfRight(itemIndex);
    const isPaired = side === "left" ? pairs[itemIndex] !== null : leftIndex !== -1;
    const row = isPaired ? pairNumber(leftIndex) : null;
    const text = (side === "left" ? exercise.left : exercise.right)[itemIndex] ?? "";
    const image = (side === "left" ? exercise.leftImageUrls : exercise.rightImageUrls)[itemIndex];
    const isHeard = side === "left" && exercise.listenLeft;
    const isWrong = isPaired && parts?.[leftIndex] === false;
    const label = isHeard ? t("matchPairs.heardItem", { number: rowOfLeft(itemIndex) + 1 }) : text;

    return (
      <ChoiceCard
        aria-invalid={isWrong || undefined}
        aria-label={row === null ? label : t("matchPairs.pairedLabel", { label, number: row + 1 })}
        aria-pressed={selected?.side === side && selected.index === itemIndex}
        data-testid={`match-pairs-${side}`}
        id={`course-exercise-answer-${index}-${side}-${itemIndex}`}
        key={itemIndex}
        kind="pair"
        onClick={() => tap(side, itemIndex)}
        pair={row}
        picked={selected?.side === side && selected.index === itemIndex}
        wrong={isWrong}
      >
        {row !== null && <ChoiceCardBadge pair={row}>{row + 1}</ChoiceCardBadge>}
        {isHeard ? <Volume2 aria-hidden="true" className="size-8" /> : image ? <ChoiceCardImage alt={text} src={image} /> : text}
      </ChoiceCard>
    );
  }

  return (
    <div className="flex flex-col gap-4 print:hidden">
      {exercise.listenLeft && !read && (
        <Alert data-testid="match-pairs-no-voice" variant="warning">
          <AlertDescription>{t("listenChoose.noVoice")}</AlertDescription>
        </Alert>
      )}
      <ChoiceCardColumns aria-label={t("matchPairs.answerLabel")} role="group">
        <div className="flex flex-col gap-3">{instance.leftOrder.map((leftIndex) => item("left", leftIndex))}</div>
        <div className="flex flex-col gap-3">{instance.rightOrder.map((rightIndex) => item("right", rightIndex))}</div>
      </ChoiceCardColumns>
      {pairs.some((paired) => paired !== null) && (
        <div>
          <Button
            data-testid="match-pairs-reset"
            onClick={() => {
              setSelected(null);
              onAnswerChange(encodeMatchPairsAnswer(pairs.map(() => null)));
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

// On paper: the left column numbered, the right one lettered, and a box by
// each number for the letter of its partner. Heard items are said by the
// teacher, so they're printed as their number only.
function PrintAnswerComponent({ exercise }: PrintAnswerComponentProps<MatchPairsCourseExercise>) {
  const { t } = useTranslation();
  // The right column keeps the file's order shifted by one, so a pair never
  // shares a line on paper (the printed sheet isn't shuffled per student).
  const rightOrder = exercise.right.map((_item, row) => (row + 1) % exercise.right.length);

  return (
    <div className="hidden flex-col gap-2 print:flex">
      <p className="text-sm">{t(exercise.listenLeft ? "matchPairs.printNoteHeard" : "matchPairs.printNote")}</p>
      <ChoiceCardColumns>
        <div className="flex flex-col gap-3">
          {exercise.left.map((text, row) => {
            const image = exercise.leftImageUrls[row];
            return (
              <div className="flex items-center gap-2" key={row}>
                <ChoiceCardMarker>{row + 1}.</ChoiceCardMarker>
                <ChoiceCard aria-hidden="true" className="flex-1" kind="pair" tabIndex={-1}>
                  {exercise.listenLeft ? <Volume2 aria-hidden="true" className="size-6" /> : image ? <ChoiceCardImage alt={text} src={image} /> : text}
                </ChoiceCard>
                <ChoiceCardAnswerBox />
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          {rightOrder.map((rightIndex, row) => {
            const text = exercise.right[rightIndex] ?? "";
            const image = exercise.rightImageUrls[rightIndex];
            return (
              <div className="flex items-center gap-2" key={rightIndex}>
                <ChoiceCardMarker>{LETTERS[row]}.</ChoiceCardMarker>
                <ChoiceCard aria-hidden="true" className="flex-1" kind="pair" tabIndex={-1}>
                  {image ? <ChoiceCardImage alt={text} src={image} /> : text}
                </ChoiceCard>
              </div>
            );
          })}
        </div>
      </ChoiceCardColumns>
    </div>
  );
}

export const matchPairsExerciseEditor: ExerciseKindEditor<
  MatchPairsTestExercise,
  SharedMatchPairsTestExerciseDefinition,
  MatchPairsCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: MatchPairsExerciseFields,
  PrintAnswerComponent,
  createExercise,
  description:
    "Two columns of words or pictures (or sounds heard): the student taps an item, then its partner, until every one is paired. Each right pair counts.",
  fromShared,
  kind: "match-pairs",
  label: "Match the pairs",
  toShared,
  validate,
};
