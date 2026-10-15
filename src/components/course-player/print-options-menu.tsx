import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  CoursePrintAnswerStyle,
  CoursePrintExerciseHintStyle,
  CoursePrintOptions,
} from "@/lib/print-options";

type PrintOptionsMenuTriggerProps = {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  ref?: React.Ref<HTMLElement>;
};

export function PrintOptionsMenu({
  children,
  graded = false,
  mode,
  onOpenChange,
  onPrint,
  onPrintOptionsChange,
  open,
  printOptions,
}: {
  children: React.ReactElement<PrintOptionsMenuTriggerProps>;
  // A graded test (SLJ-135) can print each question's points.
  graded?: boolean;
  mode: "lesson" | "test";
  // Optional: controlled from outside, e.g. the test player opening it after
  // switching from interactive mode to paper mode (SLJ-132).
  onOpenChange?: (open: boolean) => void;
  onPrint: () => void;
  onPrintOptionsChange: (nextOptions: CoursePrintOptions) => void;
  open?: boolean;
  printOptions: CoursePrintOptions;
}) {
  const { t } = useTranslation();

  const labels = {
    answerStyle:
      mode === "test"
        ? {
            box: t("courseDetails.printAnswerStyleBox"),
            empty: t("courseDetails.printAnswerStyleEmpty"),
            label: t("courseDetails.printAnswerStyle"),
            lines: t("courseDetails.printAnswerStyleLines"),
            squares: t("courseDetails.printAnswerStyleSquares"),
          }
        : undefined,
    exerciseHints:
      mode === "test"
        ? {
            hidden: t("courseDetails.printExerciseHintsHide"),
            label: t("courseDetails.printExerciseHints"),
            upsideDown: t("courseDetails.printExerciseHintsUpsideDown"),
            visible: t("courseDetails.printExerciseHintsPrint"),
          }
        : undefined,
    decorativeMedia: mode === "test" ? t("exerciseMedia.printDecorative") : undefined,
    points: mode === "test" && graded ? t("courseDetails.printGradePoints") : undefined,
    header: t("courseDetails.printOptionHeader"),
    printNow: t("courseDetails.printNow"),
    testSeparators:
      mode === "test" ? t("courseDetails.printOptionSeparators") : undefined,
    title: t("courseDetails.printOptions"),
  };

  function updateOption<Key extends keyof CoursePrintOptions>(
    key: Key,
    value: CoursePrintOptions[Key],
  ) {
    onPrintOptionsChange({
      ...printOptions,
      [key]: value,
    });
  }

  function renderAnswerStyleOption(
    value: CoursePrintAnswerStyle,
    label: string,
  ) {
    return <DropdownMenuRadioItem value={value}>{label}</DropdownMenuRadioItem>;
  }

  function renderExerciseHintOption(
    value: CoursePrintExerciseHintStyle,
    label: string,
  ) {
    return <DropdownMenuRadioItem value={value}>{label}</DropdownMenuRadioItem>;
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange} open={open}>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{labels.title}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuCheckboxItem
          checked={printOptions.showHeader}
          onCheckedChange={(checked) => updateOption("showHeader", checked)}
        >
          {labels.header}
        </DropdownMenuCheckboxItem>
        {labels.testSeparators && (
          <DropdownMenuCheckboxItem
            checked={printOptions.showTestSeparators}
            onCheckedChange={(checked) =>
              updateOption("showTestSeparators", checked)
            }
          >
            {labels.testSeparators}
          </DropdownMenuCheckboxItem>
        )}
        {labels.decorativeMedia && (
          <DropdownMenuCheckboxItem
            checked={printOptions.showDecorativeMedia}
            data-testid="print-decorative-media"
            onCheckedChange={(checked) => updateOption("showDecorativeMedia", checked)}
          >
            {labels.decorativeMedia}
          </DropdownMenuCheckboxItem>
        )}
        {labels.points && (
          <DropdownMenuCheckboxItem
            checked={printOptions.showPoints}
            data-testid="print-grade-points"
            onCheckedChange={(checked) => updateOption("showPoints", checked)}
          >
            {labels.points}
          </DropdownMenuCheckboxItem>
        )}
        {labels.answerStyle && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              onValueChange={(value) =>
                updateOption("answerStyle", value as CoursePrintAnswerStyle)
              }
              value={printOptions.answerStyle}
            >
              <DropdownMenuLabel className="pt-1">{labels.answerStyle.label}</DropdownMenuLabel>
              {renderAnswerStyleOption("lines", labels.answerStyle.lines)}
              {renderAnswerStyleOption("box", labels.answerStyle.box)}
              {renderAnswerStyleOption("empty", labels.answerStyle.empty)}
              {renderAnswerStyleOption("squares", labels.answerStyle.squares)}
            </DropdownMenuRadioGroup>
          </>
        )}
        {labels.exerciseHints && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              onValueChange={(value) =>
                updateOption(
                  "exerciseHintStyle",
                  value as CoursePrintExerciseHintStyle,
                )
              }
              value={printOptions.exerciseHintStyle}
            >
              <DropdownMenuLabel className="pt-1">
                {labels.exerciseHints.label}
              </DropdownMenuLabel>
              {renderExerciseHintOption("hidden", labels.exerciseHints.hidden)}
              {renderExerciseHintOption("visible", labels.exerciseHints.visible)}
              {renderExerciseHintOption(
                "upside-down",
                labels.exerciseHints.upsideDown,
              )}
            </DropdownMenuRadioGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onPrint}>
          <Printer aria-hidden="true" className="h-4 w-4" />
          <span>{labels.printNow}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
