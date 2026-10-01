import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SerbianLocale } from "@/lib/serbian-script";

// Shown in place of a generated Serbian locale's fields: the text there is
// made from the other script on every save, so it isn't edited by hand.
// Which script is the source is chosen in the course settings.
export function GeneratedLocaleNotice({
  onEditSource,
  source,
}: {
  onEditSource: () => void;
  source: SerbianLocale;
}) {
  const { t } = useTranslation();
  const fromLatin = source === "sr";

  return (
    <Alert variant="info">
      <Languages aria-hidden="true" />
      <AlertTitle>
        {fromLatin ? t("serbianScript.generatedFromLatin") : t("serbianScript.generatedFromCyrillic")}
      </AlertTitle>
      <AlertDescription>{t("serbianScript.generatedDescription")}</AlertDescription>
      <AlertAction>
        <Button onClick={onEditSource} size="sm" variant="secondary">
          {fromLatin ? t("serbianScript.editLatin") : t("serbianScript.editCyrillic")}
        </Button>
      </AlertAction>
    </Alert>
  );
}
