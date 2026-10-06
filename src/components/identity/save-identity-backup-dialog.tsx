import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MIN_BACKUP_PASSWORD_LENGTH } from "@/lib/identity-backup";
import { useSaveIdentityBackupMutation } from "@/lib/identity-backup-queries";

// Saves the publisher identity backup (SLJ-53): a password typed twice, then
// the OS save dialog. The password is never stored; without it the file can't
// be opened, which the dialog says plainly.
//
// `beforePublish`: the first online Publish asks for it first (nothing goes
// online without a backup); the backup then also covers `includeCourseId`,
// the course about to be published, and `onSaved` publishes it.
export function SaveIdentityBackupDialog({
  beforePublish = false,
  includeCourseId,
  onClose,
  onSaved,
  open,
}: {
  beforePublish?: boolean;
  includeCourseId?: string;
  onClose: () => void;
  onSaved?: () => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const saveMutation = useSaveIdentityBackupMutation();
  const isTooShort = [...password].length < MIN_BACKUP_PASSWORD_LENGTH;
  const isMismatch = confirmation.length > 0 && confirmation !== password;
  const canSave = !isTooShort && confirmation === password && !saveMutation.isPending;

  function close() {
    if (saveMutation.isPending) return;
    setPassword("");
    setConfirmation("");
    saveMutation.reset();
    onClose();
  }

  function save() {
    saveMutation.mutate(
      { includeCourseId, password },
      {
        onSuccess: (result) => {
          if ("cancelled" in result) return;
          close();
          onSaved?.();
        },
      },
    );
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && close()} open={open}>
      <DialogContent className="w-[min(30rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>
            {beforePublish ? t("identityBackup.beforePublishTitle") : t("identityBackup.saveTitle")}
          </DialogTitle>
          <DialogDescription>
            {beforePublish ? t("identityBackup.beforePublishDescription") : t("identityBackup.saveDescription")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSave) save();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="identity-backup-password">{t("identityBackup.password")}</FieldLabel>
              <Input
                autoComplete="new-password"
                autoFocus
                id="identity-backup-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
              <FieldDescription>
                {t("identityBackup.passwordHint", { count: MIN_BACKUP_PASSWORD_LENGTH })}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="identity-backup-password-confirmation">
                {t("identityBackup.passwordConfirmation")}
              </FieldLabel>
              <Input
                aria-invalid={isMismatch}
                autoComplete="new-password"
                id="identity-backup-password-confirmation"
                onChange={(event) => setConfirmation(event.target.value)}
                type="password"
                value={confirmation}
              />
              {isMismatch && <FieldError>{t("identityBackup.passwordMismatch")}</FieldError>}
            </Field>
          </FieldGroup>
          <Alert variant="warning">
            <TriangleAlert aria-hidden="true" />
            <AlertDescription>{t("identityBackup.passwordWarning")}</AlertDescription>
          </Alert>
          {saveMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>{saveMutation.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button onClick={close} type="button" variant="secondary">
              {t("identityBackup.cancel")}
            </Button>
            <Button data-testid="save-identity-backup" disabled={!canSave} type="submit">
              {saveMutation.isPending && <Spinner aria-hidden="true" />}
              {beforePublish ? t("identityBackup.saveAndPublish") : t("identityBackup.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
