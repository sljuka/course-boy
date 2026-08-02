import { Play, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type AlertInteractiveModeProps = {
  onDismiss: () => void;
};

export function AlertInteractiveMode({
  onDismiss,
}: AlertInteractiveModeProps) {
  const { t } = useTranslation();

  return (
    <Alert className="mb-4 border-emerald-200 bg-emerald-50/90 text-emerald-950 shadow-[0_12px_28px_-24px_rgba(16,185,129,0.45)] print:hidden">
      <div className="flex items-start gap-2">
        <Play
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 fill-emerald-600 text-emerald-600"
        />
        <div className="min-w-0 flex-1">
          <AlertTitle className="text-emerald-950">
            {t("courseDetails.interactiveHintTitle")}
          </AlertTitle>
          <AlertDescription className="mt-1.5 text-emerald-900/90">
            {t("courseDetails.interactiveHintBody")}
          </AlertDescription>
        </div>
        <Button
          aria-label={t("courseDetails.interactiveHintTitle")}
          className="rounded-full"
          size="icon"
          variant="secondary"
        >
          <Play
            aria-hidden="true"
            className="h-4 w-4 fill-emerald-600 text-emerald-600"
          />
        </Button>
        <button
          aria-label={t("courseDetails.dismissPrintHint")}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-emerald-950 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </Alert>
  );
}
