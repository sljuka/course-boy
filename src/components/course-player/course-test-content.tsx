import { useTranslation } from "react-i18next";

import { ExerciseMediaView } from "@/components/course-player/exercise-media-view";
import { getExerciseMedia } from "@/lib/exercise-media";
import { ExerciseSolution } from "@/components/test-player/exercise-solution";
import { ExercisePromptHeader } from "@/components/course-player/exercise-prompt-header";
import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { Button } from "@/components/ui/button";
import { getExerciseKindEditor } from "@/components/exercise-kinds/registry";
import type { CourseExercise } from "@/lib/course-package";
import { exercisePoints } from "@/lib/grade-bands";
import {
  getExercisePromptSource,
  interpolateTemplate,
  type ExerciseInstance,
} from "@/lib/course-player-utils";
import type {
  CoursePrintAnswerStyle,
  CoursePrintExerciseHintStyle,
} from "@/lib/print-options";
import { cn } from "@/lib/utils";

type ExerciseResult = {
  feedback: string | null;
  // False when nothing was given; incomplete when some of several boxes are
  // empty: neither is a wrong answer that can show the correct one.
  isAnswered?: boolean;
  isCorrect: boolean;
  isIncomplete?: boolean;
  parts?: boolean[] | null;
};

export const CourseTestContent = ({
  activeTestExercises,
  activeTestInstances,
  allowShowAnswer = false,
  exerciseAnswers,
  exerciseResults,
  graded = false,
  isTestPassed,
  onContinueAfterExercise,
  onFinishGradedTest,
  onRevealAnswer,
  onSubmitExercise,
  onUpdateExerciseAnswer,
  printAnswerStyle,
  printExerciseHintStyle,
  printPoints = false,
  showPrintDecorativeMedia = false,
  revealedAnswers = [],
  showPrintTestSeparators,
  testFeedback,
}: {
  activeTestExercises: CourseExercise[];
  activeTestInstances: ExerciseInstance[];
  // A practice test (SLJ-141): a wrong answer can show the correct one.
  allowShowAnswer?: boolean;
  exerciseAnswers: string[];
  exerciseResults: ExerciseResult[];
  // A graded test (SLJ-135): "Finish test" instead of "Check answers".
  graded?: boolean;
  isTestPassed: boolean;
  onContinueAfterExercise: () => void;
  // `confirm`: ask first (Enter does, so a stray one can't end the test).
  onFinishGradedTest?: (options: { confirm: boolean }) => void;
  onRevealAnswer?: (index: number) => void;
  onSubmitExercise: () => void;
  onUpdateExerciseAnswer: (index: number, value: string) => void;
  printAnswerStyle: CoursePrintAnswerStyle;
  printExerciseHintStyle: CoursePrintExerciseHintStyle;
  // Each question's points on paper (a graded test, SLJ-135).
  printPoints?: boolean;
  revealedAnswers?: boolean[];
  showPrintDecorativeMedia?: boolean;
  showPrintTestSeparators: boolean;
  testFeedback: string | null;
}) => {
  const { t } = useTranslation();

  if (
    activeTestExercises.length === 0 ||
    activeTestInstances.length !== activeTestExercises.length
  ) {
    return null;
  }

  const printableHints = activeTestExercises.flatMap((exercise, index) => {
    const exerciseInstance = activeTestInstances[index];

    if (
      exercise.kind !== "numeric" ||
      !exercise.hint ||
      exerciseInstance?.kind !== "numeric"
    ) {
      return [];
    }

    return [
      {
        hint: interpolateTemplate(exercise.hint, exerciseInstance.variables),
        id: exercise.id,
        index,
      },
    ];
  });

  function handlePrimaryAction() {
    if (graded) {
      onFinishGradedTest?.({ confirm: false });
    } else if (isTestPassed) {
      onContinueAfterExercise();
    } else {
      onSubmitExercise();
    }
  }

  return (
    <div
      className="flex flex-col gap-4 print:min-h-[240mm]"
      onKeyDown={(event) => {
        // Lets a student press Enter to check answers instead of reaching
        // for the mouse, same as `InteractiveTestPlayer`'s Enter-to-submit —
        // this view isn't a `<form>` (every exercise renders inline, not
        // one at a time), so there's no native submit behavior to piggyback
        // on; the keydown just bubbles up from whichever answer field is
        // focused.
        if (event.key !== "Enter") {
          return;
        }

        // Let a focused button/link keep its own native Enter-to-activate
        // behavior, and let a textarea keep inserting a newline.
        const targetTagName = (event.target as HTMLElement).tagName;

        if (targetTagName === "BUTTON" || targetTagName === "A" || targetTagName === "TEXTAREA") {
          return;
        }

        // Enter in a graded test asks before finishing (a second Enter
        // confirms): a stray one doesn't end the test.
        if (graded) {
          event.preventDefault();
          onFinishGradedTest?.({ confirm: true });
          return;
        }

        event.preventDefault();
        handlePrimaryAction();
      }}
    >
      <div className="flex flex-col gap-4 print:gap-(--print-exercise-gap)">
        {activeTestExercises.map((exercise, index) => {
          const exerciseInstance = activeTestInstances[index];
          const exerciseResult = exerciseResults[index];

          if (!exerciseInstance) {
            return null;
          }

          const promptSource = getExercisePromptSource(exercise, exerciseInstance);

          return (
            <div
              className={`flex break-inside-avoid flex-col gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 print:gap-(--print-exercise-inner-gap) print:pb-(--print-exercise-inner-gap) ${
                showPrintTestSeparators ? "" : "print:border-b-0"
              }`}
              key={exercise.id}
            >
              <ExerciseMediaView media={getExerciseMedia(exercise)} printDecorative={showPrintDecorativeMedia} />
              <ExercisePromptHeader
                index={index}
                printPoints={printPoints ? exercisePoints(exercise) : undefined}
                promptSource={promptSource}
              />
              {(() => {
                const { AnswerComponent } = getExerciseKindEditor(exercise.kind);

                return (
                  <AnswerComponent
                    exercise={exercise}
                    index={index}
                    instance={exerciseInstance}
                    onAnswerChange={(value) => onUpdateExerciseAnswer(index, value)}
                    parts={graded ? null : exerciseResults[index]?.parts}
                    size="lg"
                    value={exerciseAnswers[index] ?? ""}
                  />
                );
              })()}
              {(() => {
                const { PrintAnswerComponent } = getExerciseKindEditor(exercise.kind);

                return (
                  PrintAnswerComponent && (
                    <PrintAnswerComponent exercise={exercise} printAnswerStyle={printAnswerStyle} />
                  )
                );
              })()}
              {!graded && revealedAnswers[index] ? (
                <div className="print:hidden">
                  <ExerciseSolution answer={exerciseAnswers[index] ?? ""} exercise={exercise} instance={exerciseInstance} />
                </div>
              ) : (
                exerciseResult?.feedback && (
                  <div className="flex flex-wrap items-center gap-3 print:hidden">
                    <span className="text-sm font-medium text-destructive">{exerciseResult.feedback}</span>
                    {/* A wrong answer, not an empty or incomplete one (SLJ-141). */}
                    {allowShowAnswer && !graded && exerciseResult.isAnswered !== false && !exerciseResult.isIncomplete && (
                      <Button
                        data-testid="show-correct-answer"
                        onClick={() => onRevealAnswer?.(index)}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        {t("courseDetails.showCorrectAnswer")}
                      </Button>
                    )}
                  </div>
                )
              )}
            </div>
          );
        })}
        {testFeedback && (
          <div
            className={
              isTestPassed
                ? "text-sm font-medium text-success print:hidden"
                : "text-sm font-medium text-destructive print:hidden"
            }
          >
            {testFeedback}
          </div>
        )}
        <div className="flex justify-end gap-3 print:hidden">
          <Button
            data-testid="test-primary-action"
            onClick={handlePrimaryAction}
            size="lg"
          >
            {graded ? t("courseDetails.finishTest") : isTestPassed ? t("continue") : t("courseDetails.checkAnswers")}
          </Button>
        </div>
      </div>
      {printExerciseHintStyle !== "hidden" && printableHints.length > 0 && (
        <div className="hidden break-inside-avoid pt-4 print:mt-6 print:block">
          <div
            className={cn(
              // eslint-disable-next-line shadcn/no-raw-colors -- print-only (hidden except print:block above), stays literal for paper regardless of app theme
              "rounded-lg border border-stone-200 px-3 py-2 text-xs leading-5 text-muted-foreground",
              printExerciseHintStyle === "upside-down" && "rotate-180",
            )}
          >
            <div className="mb-1 font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t("courseDetails.printExerciseHints")}
            </div>
            <div className="space-y-1">
              {printableHints.map((hintItem) => (
                <p key={`${hintItem.id}-print-hint`}>
                  <span className="font-medium text-muted-foreground">
                    {hintItem.index + 1}.
                  </span>{" "}
                  <InlineMarkdown source={hintItem.hint} />
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
