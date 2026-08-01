import { Printer } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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

export type PrintOptionsMenuLabels = {
  answerStyle?: {
    box: string;
    empty: string;
    label: string;
    lines: string;
    squares: string;
  };
  exerciseHints?: {
    hidden: string;
    label: string;
    upsideDown: string;
    visible: string;
  };
  header: string;
  printNow: string;
  testSeparators?: string;
  title: string;
};

type PrintOptionsMenuTriggerProps = {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  ref?: React.Ref<HTMLElement>;
};

export function PrintOptionsMenu({
  children,
  labels,
  onPrint,
  onPrintOptionsChange,
  printOptions,
}: {
  children: React.ReactElement<PrintOptionsMenuTriggerProps>;
  labels: PrintOptionsMenuLabels;
  onPrint: () => void;
  onPrintOptionsChange: (nextOptions: CoursePrintOptions) => void;
  printOptions: CoursePrintOptions;
}) {
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
    return (
      <DropdownMenuRadioItem
        onSelect={() => updateOption("answerStyle", value)}
        selected={printOptions.answerStyle === value}
      >
        {label}
      </DropdownMenuRadioItem>
    );
  }

  function renderExerciseHintOption(
    value: CoursePrintExerciseHintStyle,
    label: string,
  ) {
    return (
      <DropdownMenuRadioItem
        onSelect={() => updateOption("exerciseHintStyle", value)}
        selected={printOptions.exerciseHintStyle === value}
      >
        {label}
      </DropdownMenuRadioItem>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{labels.title}</DropdownMenuLabel>
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
        {labels.answerStyle && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="pt-1">{labels.answerStyle.label}</DropdownMenuLabel>
            <DropdownMenuRadioGroup>
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
            <DropdownMenuLabel className="pt-1">
              {labels.exerciseHints.label}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup>
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
        <DropdownMenuItem onSelect={onPrint}>
          <Printer aria-hidden="true" className="h-4 w-4" />
          <span>{labels.printNow}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
