import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { RemoveProfileDialog } from "@/components/profile/remove-profile-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldTitle } from "@/components/ui/field";
import { useProfilesStateQuery } from "@/lib/profiles-queries";

// Settings → Danger zone → Remove this profile (SLJ-61).
export function RemoveProfileSetting() {
  const { t } = useTranslation();
  const { data: state } = useProfilesStateQuery();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const name = state?.active?.name;

  if (!name) {
    return null;
  }

  return (
    <Field className="gap-8 has-[>[data-slot=field-content]]:items-center" data-testid="remove-profile-setting" orientation="horizontal">
      <FieldContent>
        <FieldTitle>{t("settings.dangerZone.removeProfileTitle")}</FieldTitle>
        <FieldDescription>{t("settings.dangerZone.removeProfileDescription", { name })}</FieldDescription>
      </FieldContent>
      <Button
        className="shrink-0"
        data-testid="open-remove-profile"
        onClick={() => setIsRemoveOpen(true)}
        size="sm"
        variant="destructive"
      >
        <Trash2 aria-hidden="true" />
        {t("removeProfile.open")}
      </Button>
      <RemoveProfileDialog name={name} onClose={() => setIsRemoveOpen(false)} open={isRemoveOpen} />
    </Field>
  );
}
