import { CircleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// Shown above a lesson that contains blocks this app version can't read (see
// `UnknownBlock`): they render as nothing, so this is the student's only sign
// that part of the lesson is missing.
export function UnsupportedContentNotice({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation();

  return (
    <Alert data-testid="unsupported-content-notice" variant="warning">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>{t("lessonContent.unsupportedNoticeTitle")}</AlertTitle>
      <AlertDescription>{t("lessonContent.unsupportedNoticeDescription")}</AlertDescription>
      <AlertAction>
        <Button
          aria-label={t("lessonContent.dismissUnsupportedNotice")}
          onClick={onDismiss}
          size="icon-xs"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  );
}
