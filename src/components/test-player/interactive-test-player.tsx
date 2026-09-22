import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ExercisePromptHeader } from "@/components/course-player/exercise-prompt-header";
import { getExerciseKindEditor } from "@/components/exercise-kinds/registry";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
 * `currentIndex` is controlled by the parent (rather than local state) so it
 * can also drive the `ExerciseStepper` rendered in `TestPlayerView`'s own
 * header, alongside the close button.
 */
export function InteractiveTestPlayer({
  activeTestExercises,
  activeTestInstances,
  currentIndex,
  exerciseAnswers,
  exerciseResults,
  onContinueAfterExercise,
  onIndexChange,
  onSubmitExercise,
  onUpdateExerciseAnswer,
  strictAdvancement,
}: {
  activeTestExercises: CourseExercise[];
  activeTestInstances: ExerciseInstance[];
  currentIndex: number;
  exerciseAnswers: string[];
  exerciseResults: ExerciseResult[];
  onContinueAfterExercise: () => void;
  onIndexChange: (index: number) => void;
  onSubmitExercise: (index: number) => void;
  onUpdateExerciseAnswer: (index: number, value: string) => void;
  strictAdvancement: boolean;
}) {
  const { t } = useTranslation();
  const answerContainerRef = useRef<HTMLDivElement>(null);
  const [isHintRevealed, setIsHintRevealed] = useState(false);

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
    setIsHintRevealed(false);
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

    onIndexChange(currentIndex + 1);
  }

  if (!exercise || !instance || !result) {
    return null;
  }

  const { AnswerComponent } = getExerciseKindEditor(exercise.kind);
  const promptSource = getExercisePromptSource(exercise, instance);
  // The region-* kinds render an SVG diagram that scales to its container's
  // full width — the default max width leaves it cramped and hard to click
  // into precisely, so those kinds get no cap at all (the canvas itself
  // enforces a min-width instead, so it stops shrinking rather than
  // stretching this container back out — see `RegionPickerCanvas`).
  const isRegionExercise = exercise.kind.startsWith("region-");

  return (
    <form
      className={cn(
        "mx-auto flex min-h-[calc(100vh-8rem)] w-full flex-col items-center justify-center gap-6 py-6 print:hidden",
        isRegionExercise ? "max-w-none" : "max-w-2xl",
      )}
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
      <div
        className={cn(
          "flex w-full flex-col gap-3 rounded-lg border p-6 outline-none transition-[border-color,box-shadow] duration-300",
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
        <ExercisePromptHeader
          index={currentIndex}
          promptSource={promptSource}
          showIndex={false}
        />
        <AnswerComponent
          exercise={exercise}
          index={currentIndex}
          instance={instance}
          onAnswerChange={(value) => onUpdateExerciseAnswer(currentIndex, value)}
          size="lg"
          value={exerciseAnswers[currentIndex] ?? ""}
        />
        {/* Correct answers already get enough feedback from the card's
            success border/glow and the green "Continue" button below —
            only incorrect ones need an explanatory message here. A hint (if
            the exercise has one) stays hidden behind its own button instead
            of showing right away, so a student who wants to keep trying
            isn't handed the answer unasked. */}
        {hasSubmitted && !result.isCorrect && (
          <Alert variant="warning">
            <AlertDescription>
              {result.hint && !isHintRevealed ? (
                <span className="flex flex-wrap items-center gap-2">
                  {t("courseDetails.incorrectAnswer")}
                  <Button
                    onClick={() => setIsHintRevealed(true)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {t("courseDetails.showHint")}
                  </Button>
                </span>
              ) : (
                result.feedback
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div className="flex w-full items-center justify-end gap-3">
        <Button
          disabled={isPrimaryActionDisabled}
          onClick={handlePrimaryAction}
          size="lg"
          type="button"
          variant={result.isCorrect ? "success" : "secondary"}
        >
          {result.isCorrect ? t("continue") : t("courseDetails.checkAnswer")}
        </Button>
      </div>
    </form>
  );
}
