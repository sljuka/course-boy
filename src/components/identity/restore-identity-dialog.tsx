import { FileKey } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { RestoredCoursesList } from "@/components/identity/restored-courses-list";
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
  useIdentityRestoreStatusQuery,
  useRestoreIdentityMutation,
} from "@/lib/publisher-identity-queries";
import { useAppState } from "@/lib/use-app-state";

type ChosenFile = { createdAt: string; fileName: string };

// Restores the publishing identity on a new computer (SLJ-54, SLJ-55): pick a
// copy of the identity file, enter its password, and Matko looks for the
// courses published with it among students, listing them as they're found.
// Only the published version of each comes back, which the last step says
// plainly.
export function RestoreIdentityDialog({ onClose, open }: { onClose: () => void; open: boolean }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const [file, setFile] = useState<ChosenFile | null>(null);
  const [password, setPassword] = useState("");
  const [isDone, setIsDone] = useState(false);
  const chooseMutation = useChooseIdentityFileMutation();
  const restoreMutation = useRestoreIdentityMutation();
  const { data: status } = useIdentityRestoreStatusQuery();
  const fileError = chooseMutation.data && "error" in chooseMutation.data ? chooseMutation.data.error : null;
  const restoreError = restoreMutation.data && "error" in restoreMutation.data ? restoreMutation.data.error : null;

  function close() {
    if (restoreMutation.isPending) return;
    setFile(null);
    setPassword("");
    setIsDone(false);
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
    restoreMutation.mutate({ password }, { onSuccess: (result) => "restored" in result && setIsDone(true) });
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && close()} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" data-testid="restore-identity-dialog">
        {isDone ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("identityRestore.doneTitle")}</DialogTitle>
              <DialogDescription>{t("identityRestore.doneDescription")}</DialogDescription>
            </DialogHeader>
            {status && <RestoredCoursesList status={status} />}
            <DialogFooter>
              <Button autoFocus onClick={close} type="button">
                {t("identityRestore.done")}
              </Button>
            </DialogFooter>
          </>
        ) : (
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
