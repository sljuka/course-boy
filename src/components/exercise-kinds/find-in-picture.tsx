import { useRef, type MouseEvent as ReactMouseEvent } from "react";
import { Maximize2, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { areaStyle, createExercise, fromShared, toShared, validate } from "@/components/exercise-kinds/find-in-picture-logic";
import type {
  AnswerComponentProps,
  ExerciseKindEditor,
  PrintAnswerComponentProps,
  ReviewComponentProps,
} from "@/components/exercise-kinds/types";
import { FindInPictureExerciseFields } from "@/components/find-in-picture-exercise-fields";
import type { FindInPictureTestExercise } from "@/components/test-editor-prototype-types";
import { Button } from "@/components/ui/button";
import { PictureArea, PictureMiss, PictureStage, PictureStageImage } from "@/components/ui/picture-areas";
import type { FindInPictureCourseExercise, SharedFindInPictureTestExerciseDefinition } from "@/lib/course-package";
import {
  areaAt,
  decodeFindInPictureAnswer,
  encodeFindInPictureAnswer,
  type FindInPictureAnswer,
} from "@/lib/exercise-kinds/find-in-picture";

// How far (on screen) a tap may land from an area and still count for it:
// about a fingertip, so a small clock in a big picture can be hit.
const REACH_PX = 20;

const pointStyle = ([x, y]: [number, number]) => ({ left: `${x * 100}%`, top: `${y * 100}%` });

// Find in the picture (SLJ-179): tap the picture; a tap on (or near) an area
// rings it, a tap on nothing leaves a small red ring. Tapping a ring again
// takes it back. With one right area, a new tap replaces the last.
function AnswerComponent({ exercise, onAnswerChange, value }: AnswerComponentProps<FindInPictureCourseExercise>) {
  const { t } = useTranslation();
  const stage = useRef<HTMLDivElement>(null);
  const answer = decodeFindInPictureAnswer(value, exercise.areas);
  const single = exercise.areas.filter((area) => area.correct).length === 1;
  const save = (next: FindInPictureAnswer) => onAnswerChange(encodeFindInPictureAnswer(next));

  function tap(event: ReactMouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    const reachX = REACH_PX / box.width;
    const reachY = REACH_PX / box.height;

    const missIndex = answer.misses.findIndex(([missX, missY]) => Math.hypot((missX - x) / reachX, (missY - y) / reachY) <= 1);
    if (missIndex !== -1) {
      save({ ...answer, misses: answer.misses.filter((_miss, index) => index !== missIndex) });
      return;
    }
    const area = areaAt(exercise.areas, x, y, reachX, reachY);
    if (area && answer.areas.includes(area.id)) {
      const { [area.id]: _removed, ...points } = answer.points ?? {};
      save({ ...answer, areas: answer.areas.filter((id) => id !== area.id), points });
      return;
    }
    const base: FindInPictureAnswer = single ? { areas: [], misses: [], points: {} } : answer;
    save(
      area
        ? { ...base, areas: [...base.areas, area.id], points: { ...base.points, [area.id]: [x, y] } }
        : { ...base, misses: [...base.misses, [x, y]] },
    );
  }

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <PictureStage data-testid="find-in-picture-stage" onClick={tap} ref={stage}>
        <PictureStageImage alt={exercise.imageAlt} src={exercise.imageUrl} />
        {/* Hits and misses look the same until the check. */}
        {answer.areas.map((id) => {
          const area = exercise.areas.find((candidate) => candidate.id === id);
          const point = answer.points?.[id] ?? (area ? ([area.x + area.width / 2, area.y + area.height / 2] as [number, number]) : null);
          return point && <PictureMiss data-testid="find-in-picture-picked" key={id} style={pointStyle(point)} />;
        })}
        {answer.misses.map((miss, index) => (
          <PictureMiss data-testid="find-in-picture-miss" key={index} style={pointStyle(miss)} />
        ))}
      </PictureStage>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void stage.current?.requestFullscreen?.()} size="sm" type="button" variant="ghost">
          <Maximize2 aria-hidden="true" />
          {t("findInPicture.fullScreen")}
        </Button>
        {(answer.areas.length > 0 || answer.misses.length > 0) && (
          <Button data-testid="find-in-picture-reset" onClick={() => save({ areas: [], misses: [] })} size="sm" type="button" variant="ghost">
            <RotateCcw aria-hidden="true" />
            {t("matchPairs.reset")}
          </Button>
        )}
      </div>
    </div>
  );
}

// After a graded test: the right areas dashed, the student's taps right or wrong.
function ReviewComponent({ exercise, value }: ReviewComponentProps<FindInPictureCourseExercise>) {
  const answer = decodeFindInPictureAnswer(value, exercise.areas);
  return (
    <PictureStage data-testid="find-in-picture-review">
      <PictureStageImage alt={exercise.imageAlt} src={exercise.imageUrl} />
      {exercise.areas.map((area) => {
        const tapped = answer.areas.includes(area.id);
        if (!tapped && !area.correct) return null;
        return (
          <PictureArea key={area.id} shape={area.shape} style={areaStyle(area)} tone={tapped ? (area.correct ? "right" : "wrong") : "answer"} />
        );
      })}
      {answer.misses.map((miss, index) => (
        <PictureMiss key={index} style={pointStyle(miss)} tone="wrong" />
      ))}
    </PictureStage>
  );
}

// On paper: the picture, to circle on.
function PrintAnswerComponent({ exercise }: PrintAnswerComponentProps<FindInPictureCourseExercise>) {
  return (
    <div className="hidden print:block">
      <PictureStage>
        <PictureStageImage alt={exercise.imageAlt} src={exercise.imageUrl} />
      </PictureStage>
    </div>
  );
}

export const findInPictureExerciseEditor: ExerciseKindEditor<
  FindInPictureTestExercise,
  SharedFindInPictureTestExerciseDefinition,
  FindInPictureCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: FindInPictureExerciseFields,
  PrintAnswerComponent,
  ReviewComponent,
  createExercise,
  description:
    "A picture or photo with areas you draw on it: the student taps what the question asks for (\"Find the clock\"). Right when exactly the right areas are tapped.",
  fromShared,
  kind: "find-in-picture",
  label: "Find in the picture",
  toShared,
  validate,
};
