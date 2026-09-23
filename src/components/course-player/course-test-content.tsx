import { useTranslation } from "react-i18next";

import { ExercisePromptHeader } from "@/components/course-player/exercise-prompt-header";
import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { Button } from "@/components/ui/button";
import { getExerciseKindEditor } from "@/components/exercise-kinds/registry";
import type { CourseExercise } from "@/lib/course-package";
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
  isCorrect: boolean;
};

export const CourseTestContent = ({
  activeTestExercises,
  activeTestInstances,
  exerciseAnswers,
  exerciseResults,
  isTestPassed,
  onContinueAfterExercise,
  onSubmitExercise,
  onUpdateExerciseAnswer,
  printAnswerStyle,
  printExerciseHintStyle,
  showPrintTestSeparators,
  testFeedback,
}: {
  activeTestExercises: CourseExercise[];
  activeTestInstances: ExerciseInstance[];
  exerciseAnswers: string[];
  exerciseResults: ExerciseResult[];
  isTestPassed: boolean;
  onContinueAfterExercise: () => void;
  onSubmitExercise: () => void;
  onUpdateExerciseAnswer: (index: number, value: string) => void;
  printAnswerStyle: CoursePrintAnswerStyle;
  printExerciseHintStyle: CoursePrintExerciseHintStyle;
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
    if (isTestPassed) {
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

        event.preventDefault();
        handlePrimaryAction();
      }}
    >
      <div className="flex flex-col gap-4">
        {activeTestExercises.map((exercise, index) => {
          const exerciseInstance = activeTestInstances[index];
          const exerciseResult = exerciseResults[index];

          if (!exerciseInstance) {
            return null;
          }

          const promptSource = getExercisePromptSource(exercise, exerciseInstance);

          return (
            <div
              className={`flex break-inside-avoid flex-col gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 print:gap-3 print:pb-3 ${
                showPrintTestSeparators ? "" : "print:border-b-0"
              }`}
              key={exercise.id}
            >
              <ExercisePromptHeader index={index} promptSource={promptSource} />
              {(() => {
                const { AnswerComponent } = getExerciseKindEditor(exercise.kind);

                return (
                  <AnswerComponent
                    exercise={exercise}
                    index={index}
                    instance={exerciseInstance}
                    onAnswerChange={(value) => onUpdateExerciseAnswer(index, value)}
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
              {exerciseResult?.feedback && (
                <div className="text-sm font-medium text-destructive print:hidden">
                  {exerciseResult.feedback}
                </div>
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
            onClick={handlePrimaryAction}
            size="lg"
          >
            {isTestPassed ? t("continue") : t("courseDetails.checkAnswer")}
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
