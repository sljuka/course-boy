import { Info, Printer, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PrintOptionsMenu } from "@/components/course-player/print-options-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { CoursePrintOptions } from "@/lib/print-options";

type TestPlayerPrintHintProps = {
  onDismiss: () => void;
  onPrintOptionsChange: (nextOptions: CoursePrintOptions) => void;
  printOptions: CoursePrintOptions;
};

export function TestPlayerPrintHint({
  onDismiss,
  onPrintOptionsChange,
  printOptions,
}: TestPlayerPrintHintProps) {
  const { t } = useTranslation();

  return (
    <Alert className="mb-4 print:hidden" variant="info">
      <div className="flex items-start gap-2">
        <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-info" />
        <div className="min-w-0 flex-1">
          <AlertTitle>{t("courseDetails.printHintTitle")}</AlertTitle>
          <AlertDescription className="mt-1.5">
            {t("courseDetails.printHintBody")}
          </AlertDescription>
        </div>
        <div className="flex items-start gap-2">
          <PrintOptionsMenu
            mode="test"
            onPrint={() => window.print()}
            onPrintOptionsChange={onPrintOptionsChange}
            printOptions={printOptions}
          >
            <Button
              aria-label={t("courseDetails.printCourse")}
              shape="circle"
              size="icon"
              variant="secondary"
            >
              <Printer aria-hidden="true" className="h-4 w-4" />
            </Button>
          </PrintOptionsMenu>
          <button
            aria-label={t("courseDetails.dismissPrintHint")}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-info transition-colors hover:text-info/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50 focus-visible:ring-offset-2 focus-visible:ring-offset-info/10"
            onClick={onDismiss}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Alert>
  );
}
