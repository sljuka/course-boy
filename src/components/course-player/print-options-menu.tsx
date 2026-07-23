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
import type { CoursePrintOptions } from "@/lib/print-options";

export function PrintOptionsMenu({
  children,
  onPrint,
  onPrintOptionsChange,
  printAnswerStyleLabel,
  printAnswerStyleBoxLabel,
  printAnswerStyleEmptyLabel,
  printAnswerStyleLinesLabel,
  printHeaderLabel,
  printNowLabel,
  printOptions,
  printTestSeparatorsLabel,
  showAnswerStyleOptions,
  showTestSeparatorsOption,
  title,
}: {
  children: React.ReactElement<Record<string, any>>;
  onPrint: () => void;
  onPrintOptionsChange: (nextOptions: CoursePrintOptions) => void;
  printAnswerStyleLabel?: string;
  printAnswerStyleBoxLabel?: string;
  printAnswerStyleEmptyLabel?: string;
  printAnswerStyleLinesLabel?: string;
  printHeaderLabel: string;
  printNowLabel: string;
  printOptions: CoursePrintOptions;
  printTestSeparatorsLabel?: string;
  showAnswerStyleOptions?: boolean;
  showTestSeparatorsOption?: boolean;
  title: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={printOptions.showHeader}
          onCheckedChange={(checked) =>
            onPrintOptionsChange({
              ...printOptions,
              showHeader: checked,
            })
          }
        >
          {printHeaderLabel}
        </DropdownMenuCheckboxItem>
        {showTestSeparatorsOption && (
          <DropdownMenuCheckboxItem
            checked={printOptions.showTestSeparators}
            onCheckedChange={(checked) =>
              onPrintOptionsChange({
                ...printOptions,
                showTestSeparators: checked,
              })
            }
          >
            {printTestSeparatorsLabel ?? ""}
          </DropdownMenuCheckboxItem>
        )}
        {showAnswerStyleOptions && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="pt-1">
              {printAnswerStyleLabel ?? ""}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup>
              <DropdownMenuRadioItem
                onSelect={() =>
                  onPrintOptionsChange({
                    ...printOptions,
                    answerStyle: "lines",
                  })
                }
                selected={printOptions.answerStyle === "lines"}
              >
                {printAnswerStyleLinesLabel ?? ""}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                onSelect={() =>
                  onPrintOptionsChange({
                    ...printOptions,
                    answerStyle: "box",
                  })
                }
                selected={printOptions.answerStyle === "box"}
              >
                {printAnswerStyleBoxLabel ?? ""}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                onSelect={() =>
                  onPrintOptionsChange({
                    ...printOptions,
                    answerStyle: "empty",
                  })
                }
                selected={printOptions.answerStyle === "empty"}
              >
                {printAnswerStyleEmptyLabel ?? ""}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onPrint}>
          <Printer aria-hidden="true" className="h-4 w-4" />
          <span>{printNowLabel}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
