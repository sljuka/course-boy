import { FileKey } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  useChooseIdentityFileMutation,
  useRestoreIdentityMutation,
} from "@/lib/publisher-identity-queries";
import { useAppState } from "@/lib/use-app-state";

type ChosenFile = { createdAt: string; fileName: string };

// Restores the publishing identity on a new computer (SLJ-54, SLJ-55): pick a
// copy of the identity file and enter its password. Matko then looks for the
// courses published with it among the people who have them, which can take
// minutes, so the dialog closes and My courses shows the search (its
// Restoring group, SLJ-66).
export function RestoreIdentityDialog({ onClose, open }: { onClose: () => void; open: boolean }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const [file, setFile] = useState<ChosenFile | null>(null);
  const [password, setPassword] = useState("");
  const chooseMutation = useChooseIdentityFileMutation();
  const restoreMutation = useRestoreIdentityMutation();
  const navigate = useNavigate();
  const fileError = chooseMutation.data && "error" in chooseMutation.data ? chooseMutation.data.error : null;
  const restoreError = restoreMutation.data && "error" in restoreMutation.data ? restoreMutation.data.error : null;

  function close() {
    if (restoreMutation.isPending) return;
    closeNow();
  }

  // Forgets the file and password, and closes.
  function closeNow() {
    setFile(null);
    setPassword("");
    chooseMutation.reset();
    restoreMutation.reset();
    onClose();
  }

  function chooseFile() {
    restoreMutation.reset();
    chooseMutation.mutate(undefined, {
      onSuccess: (result) => "file" in result && setFile(result.file),
    });
  }

  function restore() {
    restoreMutation.mutate(
      { password },
      {
        onSuccess: (result) => {
          if (!("restored" in result)) return;
          // The search can take minutes: it's shown on My courses (SLJ-66),
          // not here.
          closeNow();
          navigate("/my-courses");
        },
      },
    );
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && close()} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" data-testid="restore-identity-dialog">
        {(
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (file && password && !restoreMutation.isPending) restore();
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("identityRestore.title")}</DialogTitle>
              <DialogDescription>{t("identityRestore.description")}</DialogDescription>
            </DialogHeader>
            <Field>
              <div>
                <Button
                  data-testid="choose-identity-backup"
                  disabled={chooseMutation.isPending || restoreMutation.isPending}
                  onClick={chooseFile}
                  type="button"
                  variant="secondary"
                >
                  <FileKey aria-hidden="true" />
                  {file ? t("identityRestore.chooseOtherFile") : t("identityRestore.chooseFile")}
                </Button>
              </div>
              {file && (
                <FieldDescription data-testid="identity-backup-file">
                  {t("identityRestore.fileSummary", {
                    date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(file.createdAt)),
                    fileName: file.fileName,
                  })}
                </FieldDescription>
              )}
              {fileError && <FieldError>{t(`identityRestore.errors.${fileError}`)}</FieldError>}
            </Field>
            {file && (
              <Field>
                <FieldLabel htmlFor="identity-restore-password">{t("identityRestore.password")}</FieldLabel>
                <Input
                  autoComplete="current-password"
                  autoFocus
                  id="identity-restore-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </Field>
            )}
            {restoreError && (
              <Alert data-testid="identity-restore-error" variant="destructive">
                <AlertDescription>{t(`identityRestore.errors.${restoreError}`)}</AlertDescription>
              </Alert>
            )}
            {restoreMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>{restoreMutation.error.message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button disabled={restoreMutation.isPending} onClick={close} type="button" variant="secondary">
                {t("identityRestore.cancel")}
              </Button>
              <Button
                data-testid="restore-identity"
                disabled={!file || !password || restoreMutation.isPending}
                type="submit"
              >
                {restoreMutation.isPending && <Spinner aria-hidden="true" />}
                {t("identityRestore.restore")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
