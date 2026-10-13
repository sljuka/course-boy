import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { useBackgroundPreferences } from "@/lib/background-queries";

// Settings → Sharing (SLJ-129): keep sharing when the window is closed, and
// open at login. Only where there's a menu bar icon to keep running under.
export function BackgroundSettings() {
  const { t } = useTranslation();
  const [preferences, save] = useBackgroundPreferences();
  if (!window.background.isSupported) return null;

  return (
    <>
      <FieldLabel htmlFor="settings-keep-sharing">
        <Field orientation="horizontal">
          <Checkbox
            checked={preferences.keepSharing === true}
            data-testid="settings-keep-sharing"
            id="settings-keep-sharing"
            onCheckedChange={(checked) => void save({ keepSharingInBackground: checked === true })}
          />
          <FieldContent>
            <FieldTitle>{t("background.settingKeep")}</FieldTitle>
            <FieldDescription>{t("background.settingKeepHint")}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor="settings-open-at-login">
        <Field orientation="horizontal">
          <Checkbox
            checked={preferences.openAtLogin}
            data-testid="settings-open-at-login"
            id="settings-open-at-login"
            onCheckedChange={(checked) => void save({ openAtLogin: checked === true })}
          />
          <FieldContent>
            <FieldTitle>{t("background.settingOpenAtLogin")}</FieldTitle>
            <FieldDescription>{t("background.settingOpenAtLoginHint")}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
    </>
  );
}
