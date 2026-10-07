import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// How to keep the identity file safe (SLJ-53, SLJ-55), as one warning in
// Settings → Publishing: copies of the file and the password apart, two copies,
// a long unique password, never sent around. (The setup wizard only says that a
// lost password can't be recovered.)
const TIPS = ["separate", "twoCopies", "longPassword", "neverSend"] as const;

export function IdentitySafetyTips() {
  const { t } = useTranslation();

  return (
    <Alert data-testid="identity-safety-tips" variant="warning">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>{t("publisherIdentity.tipsTitle")}</AlertTitle>
      <AlertDescription>
        <ul className="flex list-disc flex-col gap-1 pl-4">
          {TIPS.map((tip) => (
            <li key={tip}>{t(`publisherIdentity.tips.${tip}`)}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
