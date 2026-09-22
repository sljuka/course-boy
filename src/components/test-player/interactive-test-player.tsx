import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ExercisePromptHeader } from "@/components/course-player/exercise-prompt-header";
import { getExerciseKindEditor } from "@/components/exercise-kinds/registry";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ExerciseResult } from "@/components/test-player/use-test-player-state";
import type { CourseExercise } from "@/lib/course-package";
import { getExercisePromptSource, type ExerciseInstance } from "@/lib/course-player-utils";
import { cn } from "@/lib/utils";

/**
 * The one-exercise-at-a-time counterpart to `CourseTestContent` — mounted in
 * place of it when `isInteractiveMode` is true (see `TestPlayerView`).
 * Reuses the exact same shared `exerciseAnswers`/`exerciseResults` state and
 * `getExerciseKindEditor(kind).AnswerComponent` as the all-at-once view, so
 * switching between the two modes mid-test never loses progress.
 */
export function InteractiveTestPlayer({
  activeTestExercises,
  activeTestInstances,
  exerciseAnswers,
  exerciseResults,
  onContinueAfterExercise,
  onExit,
  onSubmitExercise,
  onUpdateExerciseAnswer,
  strictAdvancement,
}: {
  activeTestExercises: CourseExercise[];
  activeTestInstances: ExerciseInstance[];
  exerciseAnswers: string[];
  exerciseResults: ExerciseResult[];
  onContinueAfterExercise: () => void;
  onExit: () => void;
  onSubmitExercise: (index: number) => void;
  onUpdateExerciseAnswer: (index: number, value: string) => void;
  strictAdvancement: boolean;
}) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const answerContainerRef = useRef<HTMLDivElement>(null);

  // Focuses the current exercise's first input so a student can start typing
  // (and submit with Enter) right away — kind-agnostic on purpose, since
  // `AnswerComponent` is a black box per kind and most kinds render at least
  // one real `<input>`/`<textarea>`/`<select>`. Kinds with no such control
  // (e.g. a click-driven diagram) fall back to focusing the container itself,
  // so Enter-to-submit below still has something focused inside the form to
  // bubble from.
  useEffect(() => {
    const container = answerContainerRef.current;
    const firstField = container?.querySelector<HTMLElement>("input, textarea, select");

    (firstField ?? container)?.focus();
  }, [currentIndex]);

  const total = activeTestExercises.length;
  const exercise = activeTestExercises[currentIndex];
  const instance = activeTestInstances[currentIndex];
  const result = exerciseResults[currentIndex];
  const isLast = currentIndex === total - 1;
  const hasSubmitted = Boolean(result?.isCorrect) || result?.feedback != null;
  const canAdvance = Boolean(result?.isCorrect) || !strictAdvancement;
  const isPrimaryActionDisabled = hasSubmitted && !canAdvance;

  function handlePrimaryAction() {
    if (!hasSubmitted) {
      onSubmitExercise(currentIndex);
      return;
    }

    if (isLast) {
      onContinueAfterExercise();
      return;
    }

    setCurrentIndex((index) => index + 1);
  }

  if (!exercise || !instance || !result) {
    return null;
  }

  const { AnswerComponent } = getExerciseKindEditor(exercise.kind);
  const promptSource = getExercisePromptSource(exercise, instance);

  return (
    <form
      className="flex flex-col gap-4 print:hidden"
      onKeyDown={(event) => {
        // Lets a student press Enter after answering instead of reaching for
        // the mouse. Handled directly here rather than relying on the
        // browser's native submit-on-Enter, since a click-driven answer
        // (e.g. region-picker's SVG canvas) never focuses a text control for
        // that native behavior to trigger from — the fallback focus below
        // keeps something inside this form focused either way, so this
        // handler always sees the keypress.
        if (event.key !== "Enter") {
          return;
        }

        // Let a focused button/link keep its own native Enter-to-activate
        // behavior (e.g. the "Previous" button) instead of hijacking it, and
        // let a textarea keep inserting a newline.
        const targetTagName = (event.target as HTMLElement).tagName;

        if (targetTagName === "BUTTON" || targetTagName === "A" || targetTagName === "TEXTAREA") {
          return;
        }

        event.preventDefault();
        handlePrimaryAction();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <Button onClick={onExit} size="sm" type="button" variant="ghost">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("courseDetails.exitInteractiveMode")}
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          {t("courseDetails.exerciseProgress", {
            current: currentIndex + 1,
            total,
          })}
        </span>
      </div>
      <Progress value={((currentIndex + 1) / total) * 100} />
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border p-6 outline-none transition-[border-color,box-shadow] duration-300",
          !hasSubmitted && "border-border",
          hasSubmitted &&
            (result.isCorrect
              ? "border-success ring-4 ring-success/15"
              : "border-warning ring-4 ring-warning/15"),
        )}
        onMouseDown={(event) => {
          // A click on a non-focusable answer control (e.g. an SVG region in
          // region-picker) would otherwise blur focus out to <body> by
          // default, taking it outside this form and breaking Enter-to-submit
          // above. Only suppress that default when the click isn't on an
          // actual form control, so real inputs still focus normally.
          const target = event.target as HTMLElement;

          if (!target.closest("input, textarea, select, button, a")) {
            event.preventDefault();
          }
        }}
        ref={answerContainerRef}
        tabIndex={-1}
      >
        <ExercisePromptHeader index={currentIndex} promptSource={promptSource} />
        <AnswerComponent
          exercise={exercise}
          index={currentIndex}
          instance={instance}
          onAnswerChange={(value) => onUpdateExerciseAnswer(currentIndex, value)}
          size="lg"
          value={exerciseAnswers[currentIndex] ?? ""}
        />
        {hasSubmitted && (
          <Alert variant={result.isCorrect ? "success" : "warning"}>
            <AlertDescription>
              {result.isCorrect ? t("courseDetails.exerciseCorrect") : result.feedback}
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          size="lg"
          type="button"
          variant="secondary"
        >
          {t("courseDetails.previousExercise")}
        </Button>
        <Button
          disabled={isPrimaryActionDisabled}
          onClick={handlePrimaryAction}
          size="lg"
          type="button"
          variant={hasSubmitted ? "default" : "secondary"}
        >
          {!hasSubmitted
            ? t("courseDetails.checkAnswer")
            : isLast
              ? t("continue")
              : t("courseDetails.nextExercise")}
        </Button>
      </div>
    </form>
  );
}
