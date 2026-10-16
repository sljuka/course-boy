import { Eraser } from "lucide-react";
import { Fragment, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import type { PunctuationCourseExercise, SharedPunctuationTestExerciseDefinition } from "@/lib/course-package";
import { decodePunctuationAnswer, encodePunctuationAnswer } from "@/lib/punctuation";

import { PunctuationExerciseFields } from "@/components/punctuation-exercise-fields";
import type { PunctuationTestExercise } from "@/components/test-editor-prototype-types";
import type {
  AnswerComponentProps,
  ExerciseKindEditor,
  PrintAnswerComponentProps,
} from "@/components/exercise-kinds/types";
import {
  createExercise,
  fromShared,
  toShared,
  validate,
} from "@/components/exercise-kinds/punctuation-logic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PunctuationGap, PunctuationMark } from "@/components/ui/punctuation-gap";

// The sentence without its marks, a gap before, between and after the words
// (SLJ-145). A gap opens a palette of marks; each pick adds one there, so a
// gap can hold "“,". With the gap focused, typing a mark adds it, Backspace
// takes the last one off and Delete clears it. After a check (practice), the
// gaps that aren't as they should be turn red.
function AnswerComponent({ exercise, onAnswerChange, parts, value }: AnswerComponentProps<PunctuationCourseExercise>) {
  const { t } = useTranslation();
  const placed = decodePunctuationAnswer(value, exercise.gaps.length);
  const setGap = (index: number, marks: string) =>
    onAnswerChange(encodePunctuationAnswer(placed.map((current, gapIndex) => (gapIndex === index ? marks : current))));
  const gapLabel = (index: number) =>
    index < exercise.words.length
      ? t("punctuation.gapBefore", { word: exercise.words[index] })
      : t("punctuation.gapAtEnd");

  function onGapKeyDown(event: KeyboardEvent, index: number) {
    if (exercise.marks.includes(event.key)) {
      event.preventDefault();
      setGap(index, placed[index] + event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      setGap(index, [...placed[index]].slice(0, -1).join(""));
    } else if (event.key === "Delete") {
      event.preventDefault();
      setGap(index, "");
    }
  }

  return (
    <p className="leading-10 text-foreground print:hidden" data-testid="punctuation-sentence">
      {exercise.gaps.map((_, index) => (
        <Fragment key={index}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <PunctuationGap
                  aria-label={`${gapLabel(index)}${placed[index] ? `: ${placed[index]}` : ""}`}
                  data-testid="punctuation-gap"
                  filled={Boolean(placed[index])}
                  onKeyDown={(event) => onGapKeyDown(event, index)}
                  tone={parts && parts[index] === false ? "wrong" : "neutral"}
                />
              }
            >
              {placed[index]}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="grid w-auto grid-cols-5 gap-0.5">
              {exercise.marks.map((mark) => (
                <DropdownMenuItem
                  aria-label={t("punctuation.addMark", { mark })}
                  key={mark}
                  onClick={() => setGap(index, placed[index] + mark)}
                >
                  <PunctuationMark>{mark}</PunctuationMark>
                </DropdownMenuItem>
              ))}
              {placed[index] && (
                <>
                  <DropdownMenuSeparator className="col-span-5" />
                  <DropdownMenuItem className="col-span-5" onClick={() => setGap(index, "")}>
                    <Eraser aria-hidden="true" />
                    {t("punctuation.clear")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {index < exercise.words.length && <span>{exercise.words[index]}</span>}
        </Fragment>
      ))}
    </p>
  );
}

// On paper: the sentence without its marks, with room between the words to
// write them in by hand.
function PrintAnswerComponent({ exercise }: PrintAnswerComponentProps<PunctuationCourseExercise>) {
  return (
    <p className="hidden leading-9 print:block">
      {exercise.words.map((word, index) => (
        <Fragment key={index}>
          <span className="inline-block w-6" />
          <span>{word}</span>
        </Fragment>
      ))}
      <span className="inline-block w-6" />
    </p>
  );
}

export const punctuationExerciseEditor: ExerciseKindEditor<
  PunctuationTestExercise,
  SharedPunctuationTestExerciseDefinition,
  PunctuationCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: PunctuationExerciseFields,
  PrintAnswerComponent,
  createExercise,
  description: "A sentence without its punctuation: the student places each mark where it belongs.",
  fromShared,
  kind: "punctuation",
  label: "Punctuation",
  toShared,
  validate,
};
