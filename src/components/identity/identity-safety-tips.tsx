import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// How to keep the publisher identity backup safe (SLJ-53), as one warning in
// Settings → Security: the file and its password apart, two copies, a long
// unique password, never sent around, a fresh backup after a new course. (The
// backup dialog only says that a lost password can't be recovered.)
const TIPS = ["separate", "twoCopies", "longPassword", "neverSend", "afterNewCourse"] as const;

export function IdentitySafetyTips() {
  const { t } = useTranslation();

  return (
    <Alert data-testid="identity-safety-tips" variant="warning">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>{t("identityBackup.tipsTitle")}</AlertTitle>
      <AlertDescription>
        <ul className="flex list-disc flex-col gap-1 pl-4">
          {TIPS.map((tip) => (
            <li key={tip}>{t(`identityBackup.tips.${tip}`)}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
