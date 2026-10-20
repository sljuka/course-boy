import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { useActivitySettingsQuery, useSetActivitySettingsMutation } from "@/lib/activity-queries";

// Settings → Activity (SLJ-168): whether this profile tells the teachers of
// the courses it takes about its progress (imported, started, sections and
// courses finished), without a name. On unless turned off.
export function ShareActivitySetting() {
  const { t } = useTranslation();
  const { data: settings } = useActivitySettingsQuery();
  const setSettings = useSetActivitySettingsMutation();
  if (!settings) return null;

  return (
    <FieldLabel>
      <Field orientation="horizontal">
        <Checkbox
          checked={settings.enabled}
          data-testid="settings-share-activity"
          disabled={setSettings.isPending}
          onCheckedChange={(checked) => setSettings.mutate({ enabled: checked === true })}
        />
        <FieldContent>
          <span>{t("courseActivity.settings.share")}</span>
          <FieldDescription>{t("courseActivity.settings.shareHint")}</FieldDescription>
        </FieldContent>
      </Field>
    </FieldLabel>
  );
}
