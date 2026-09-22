import { Play, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type AlertInteractiveModeProps = {
  onDismiss: () => void;
  onStart: () => void;
};

export function AlertInteractiveMode({
  onDismiss,
  onStart,
}: AlertInteractiveModeProps) {
  const { t } = useTranslation();

  return (
    <Alert className="mb-4 print:hidden" variant="success">
      <div className="flex items-start gap-2">
        <Play aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 fill-success text-success" />
        <div className="min-w-0 flex-1">
          <AlertTitle>{t("courseDetails.interactiveHintTitle")}</AlertTitle>
          <AlertDescription className="mt-1.5">
            {t("courseDetails.interactiveHintBody")}
          </AlertDescription>
        </div>
        <Button
          aria-label={t("courseDetails.interactiveHintTitle")}
          onClick={onStart}
          shape="circle"
          size="icon"
          variant="secondary"
        >
          <Play aria-hidden="true" className="h-4 w-4 fill-success text-success" />
        </Button>
        <button
          aria-label={t("courseDetails.dismissPrintHint")}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-success transition-colors hover:text-success/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/50 focus-visible:ring-offset-2 focus-visible:ring-offset-success/10"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </Alert>
  );
}
