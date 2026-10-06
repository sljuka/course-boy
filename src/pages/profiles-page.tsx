import { FormEvent, useState } from "react";
import { Info, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getPersonaImageUrl } from "@/lib/personas";
import { checkProfileName, MAX_PROFILE_NAME_LENGTH } from "@/lib/profiles";
import { useProfilesStateQuery } from "@/lib/profiles-queries";
import { useAppState } from "@/lib/use-app-state";

// The launcher (SLJ-57): no profile is open. With none on this computer yet,
// it's the welcome screen asking for a name, which creates the first profile;
// otherwise the picker ("Who's learning?") with a New profile button.
// Opening or creating a profile restarts the app into it.
export function ProfilesPage() {
  const { data: state } = useProfilesStateQuery();
  const [isCreating, setIsCreating] = useState(false);

  if (!state) {
    return null;
  }

  return state.profiles.length === 0 || isCreating ? (
    <CreateProfileForm firstProfile={state.profiles.length === 0} onCancel={() => setIsCreating(false)} />
  ) : (
    <ProfilePicker onCreate={() => setIsCreating(true)} />
  );
}

function ProfilePicker({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  const { data: state } = useProfilesStateQuery();
  const [openingId, setOpeningId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5" data-testid="profile-picker">
      <div className="flex flex-col gap-1">
        <CardTitle className="text-3xl text-primary">{t("profiles.pickerTitle")}</CardTitle>
        <CardDescription>{t("profiles.pickerDescription")}</CardDescription>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {state?.profiles.map((profile) => (
          <Button
            className="h-auto justify-start gap-3 p-3"
            data-testid="open-profile"
            disabled={openingId !== null}
            key={profile.id}
            onClick={() => {
              setOpeningId(profile.id);
              void window.profiles.open(profile.id);
            }}
            variant="outline"
          >
            {openingId === profile.id ? (
              <Spinner aria-hidden="true" />
            ) : (
              <img alt="" className="size-10 shrink-0" src={getPersonaImageUrl(profile.persona)} />
            )}
            <span className="truncate">{profile.name}</span>
          </Button>
        ))}
      </div>
      <div>
        <Button disabled={openingId !== null} onClick={onCreate} variant="secondary">
          <Plus aria-hidden="true" />
          {t("profiles.newProfile")}
        </Button>
      </div>
    </div>
  );
}

function CreateProfileForm({ firstProfile, onCancel }: { firstProfile: boolean; onCancel: () => void }) {
  const { t } = useTranslation();
  const { locale, setLocale } = useAppState();
  const [name, setName] = useState("");
  // SLJ-54: the restore dialog opens once onboarding is done.
  const [restoreIdentity, setRestoreIdentity] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = checkProfileName(name);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!check.ok || isCreating) return;

    setIsCreating(true);
    window.profiles.create({ locale, name: check.name, restoreIdentity }).catch((createError: Error) => {
      setIsCreating(false);
      setError(createError.message);
    });
  }

  return (
    <form className="flex flex-col gap-4" data-testid="create-profile" onSubmit={handleSubmit}>
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4 pr-2">
          <CardTitle className="text-3xl text-primary sm:text-4xl">
            {firstProfile ? t("welcomeTitle") : t("profiles.newProfileTitle")}
          </CardTitle>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">
            {firstProfile ? t("welcomeSubtitle") : t("profiles.newProfileDescription")}
          </p>
        </div>
        <div className="self-end sm:self-auto">
          <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
        </div>
      </div>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="name">{t("nameLabel")}</FieldLabel>
          <Input
            aria-invalid={!check.ok && check.problem === "tooLong"}
            autoComplete="nickname"
            autoFocus
            id="name"
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            value={name}
          />
          {!check.ok && check.problem === "tooLong" && (
            <FieldError>{t("profiles.nameTooLong", { max: MAX_PROFILE_NAME_LENGTH })}</FieldError>
          )}
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <Alert variant="info">
          <Info aria-hidden="true" className="h-4 w-4 text-info" />
          <AlertDescription>{t("nameHint")}</AlertDescription>
        </Alert>
        <FieldLabel htmlFor="restore-identity">
          <Field orientation="horizontal">
            <Checkbox
              checked={restoreIdentity}
              data-testid="restore-identity-after-setup"
              id="restore-identity"
              onCheckedChange={(checked) => setRestoreIdentity(checked === true)}
            />
            <FieldTitle>{t("profiles.restoreIdentity")}</FieldTitle>
          </Field>
        </FieldLabel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="sm:w-auto sm:px-6" disabled={!check.ok || isCreating} type="submit">
            {isCreating && <Spinner aria-hidden="true" />}
            {t("continue")}
          </Button>
          {!firstProfile && (
            <Button disabled={isCreating} onClick={onCancel} type="button" variant="ghost">
              {t("profiles.cancel")}
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}
