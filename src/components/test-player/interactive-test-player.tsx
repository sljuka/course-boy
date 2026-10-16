import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ExerciseMediaView } from "@/components/course-player/exercise-media-view";
import { getExerciseMedia } from "@/lib/exercise-media";
import { ExercisePromptHeader } from "@/components/course-player/exercise-prompt-header";
import { ExerciseSolution } from "@/components/test-player/exercise-solution";
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
  allowShowAnswer = false,
  currentIndex,
  exerciseAnswers,
  exerciseResults,
  graded = false,
  onContinueAfterExercise,
  onFinishGradedTest,
  onIndexChange,
  onRevealAnswer,
  onSubmitExercise,
  onUpdateExerciseAnswer,
  revealedAnswers = [],
}: {
  activeTestExercises: CourseExercise[];
  activeTestInstances: ExerciseInstance[];
  // A practice test (SLJ-141): after a wrong answer, "Show correct answer"
  // shows it and lets the student move on.
  allowShowAnswer?: boolean;
  currentIndex: number;
  exerciseAnswers: string[];
  exerciseResults: ExerciseResult[];
  // A graded test (SLJ-135): no answer is checked as it's given; Next moves
  // on, and the last exercise's button finishes the test.
  graded?: boolean;
  onContinueAfterExercise: () => void;
  // `confirm`: ask first (Enter does, so a stray one can't end the test).
  onFinishGradedTest?: (options: { confirm: boolean }) => void;
  onIndexChange: (index: number) => void;
  onRevealAnswer?: (index: number) => void;
  onSubmitExercise: (index: number) => void;
  onUpdateExerciseAnswer: (index: number, value: string) => void;
  revealedAnswers?: boolean[];
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
  const hasSubmitted = !graded && (Boolean(result?.isCorrect) || result?.feedback != null);
  // Its correct answer shown (SLJ-141): done, like a right answer.
  const isRevealed = !graded && revealedAnswers[currentIndex] === true;
  // A wrong answer (not an empty or incomplete one) can show the correct one.
  const canReveal =
    allowShowAnswer && !isRevealed && hasSubmitted && !result?.isCorrect && result?.isAnswered && !result.isIncomplete;
  // A practice test moves on only after a correct answer, or the correct one shown.
  const isPrimaryActionDisabled = !isRevealed && hasSubmitted && !result?.isCorrect;

  // A wrong answer shakes the card a little, beside its sound (SLJ-147).
  // Each check makes a new result, so checking again wrong shakes again;
  // typing (an unchecked result), empty or incomplete answers, and going
  // back to a question answered wrong earlier don't.
  const isWrongAnswer = !graded && result != null && result.isAnswered && !result.isIncomplete && !result.isCorrect;
  const shownIndexRef = useRef(currentIndex);
  useEffect(() => {
    const isSameQuestion = shownIndexRef.current === currentIndex;
    shownIndexRef.current = currentIndex;
    if (isWrongAnswer && isSameQuestion) shake(answerContainerRef.current);
  }, [currentIndex, isWrongAnswer, result]);

  function handlePrimaryAction() {
    if (graded) {
      if (isLast) onFinishGradedTest?.({ confirm: false });
      else onIndexChange(currentIndex + 1);
      return;
    }

    if (!hasSubmitted && !isRevealed) {
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
        // page-fade-in here plays once, when this form itself mounts (i.e.
        // entering interactive mode) — it doesn't retrigger on its own for
        // a step change, since the form's own identity/class list never
        // changes between steps. The per-step fade below is separate.
        // flex-1 fills the page body's height (the page gives it `min-h-full`
        // in interactive mode) so the card is centred without a viewport-based
        // min height, which overflowed the body and showed a needless scrollbar.
        "page-fade-in mx-auto flex w-full flex-1 flex-col items-center justify-center gap-6 py-6 print:hidden",
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

        // Enter on a graded test's last question asks before finishing (a
        // second Enter confirms): a stray one doesn't end the test.
        if (graded && isLast) {
          event.preventDefault();
          onFinishGradedTest?.({ confirm: true });
          return;
        }

        event.preventDefault();
        handlePrimaryAction();
      }}
    >
      <div
        className={cn(
          // page-fade-in re-triggers on every step because of `key`
          // below — React tears down and remounts this div (a fresh DOM
          // node) rather than patching the existing one in place, which is
          // what actually restarts a CSS animation.
          "page-fade-in flex w-full flex-col gap-3 rounded-lg border p-6 outline-none transition-[border-color,box-shadow] duration-300",
          !hasSubmitted && "border-border",
          hasSubmitted &&
            (result.isCorrect
              ? "border-success ring-4 ring-success/15"
              : "border-warning ring-4 ring-warning/15"),
        )}
        key={currentIndex}
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
        <ExerciseMediaView media={getExerciseMedia(exercise)} />
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
          parts={hasSubmitted ? result.parts : null}
          size="lg"
          value={exerciseAnswers[currentIndex] ?? ""}
        />
        {/* Correct answers already get enough feedback from the card's
            success border/glow and the green "Continue" button below —
            only incorrect ones need an explanatory message here. A hint (if
            the exercise has one) stays hidden behind its own button instead
            of showing right away, so a student who wants to keep trying
            isn't handed the answer unasked. */}
        {isRevealed ? (
          <ExerciseSolution answer={exerciseAnswers[currentIndex] ?? ""} exercise={exercise} instance={instance} />
        ) : hasSubmitted && !result.isCorrect && (
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
        {canReveal && (
          <Button
            data-testid="show-correct-answer"
            onClick={() => onRevealAnswer?.(currentIndex)}
            size="lg"
            type="button"
            variant="ghost"
          >
            {t("courseDetails.showCorrectAnswer")}
          </Button>
        )}
        <Button
          disabled={isPrimaryActionDisabled}
          onClick={handlePrimaryAction}
          size="lg"
          type="button"
          variant={graded ? (isLast ? "default" : "secondary") : result.isCorrect ? "success" : "secondary"}
        >
          {graded
            ? isLast
              ? t("courseDetails.finishTest")
              : t("courseDetails.nextQuestion")
            : result.isCorrect || isRevealed
              ? t("continue")
              : t("courseDetails.checkAnswer")}
        </Button>
      </div>
    </form>
  );
}

// A short side-to-side shake, settling quickly. Not for anyone who asked
// their system for less motion.
function shake(element: HTMLElement | null) {
  if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  element.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(5px)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(2px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 360, easing: "ease-out" },
  );
}
