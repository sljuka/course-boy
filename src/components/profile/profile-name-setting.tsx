import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { checkProfileName, MAX_PROFILE_NAME_LENGTH } from "@/lib/profiles";
import { queryClient } from "@/lib/query-client";
import { useAppState } from "@/lib/use-app-state";

// Settings → General → Profile name: the label people on this computer pick
// their profile by (SLJ-57). Saved when the field is left or Enter is
// pressed, if it's valid; main keeps profile.json in step for the picker.
export function ProfileNameSetting() {
  const { t } = useTranslation();
  const { submitNickname, submittedName } = useAppState();
  const [draft, setDraft] = useState(submittedName);
  const check = checkProfileName(draft);

  function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!check.ok || check.name === submittedName) return;
    submitNickname(check.name);
    setDraft(check.name);
    void queryClient.invalidateQueries({ queryKey: ["profiles"] });
  }

  return (
    <form onSubmit={save}>
      <Field className="gap-8 has-[>[data-slot=field-content]]:items-center" orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="settings-profile-name">{t("settings.general.profileName")}</FieldLabel>
          <FieldDescription>{t("settings.general.profileNameDescription")}</FieldDescription>
          {!check.ok && (
            <FieldError>
              {check.problem === "tooLong"
                ? t("profiles.nameTooLong", { max: MAX_PROFILE_NAME_LENGTH })
                : t("settings.general.profileNameEmpty")}
            </FieldError>
          )}
        </FieldContent>
        <Input
          aria-invalid={!check.ok}
          autoComplete="nickname"
          className="w-56 shrink-0"
          id="settings-profile-name"
          onBlur={() => save()}
          onChange={(event) => setDraft(event.target.value)}
          value={draft}
        />
      </Field>
    </form>
  );
}
