import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { discardImport, useImportCourseMutation, useTransferQuery } from "@/lib/sharing-queries";

type ImportCourseDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

// Takes a course code and starts the import. It doesn't wait for the download
// (SLJ-49): once the worker has accepted the code and the transfer exists, the
// dialog closes and Home lists the course under Downloading, with its progress
// and Cancel, until it lands under Imported. An error before that (a bad code)
// is shown here instead.
export function ImportCourseDialog({ onOpenChange, open }: ImportCourseDialogProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState<Error | null>(null);
  // The import being started, until it's handed off to Home.
  const [transferId, setTransferId] = useState<string | null>(null);
  const importMutation = useImportCourseMutation();
  const { data: transfer } = useTransferQuery(transferId);
  const isStarting = transferId !== null;

  function close() {
    setCode("");
    setError(null);
    setTransferId(null);
    // Detaches this dialog from the import; it keeps running for Home.
    importMutation.reset();
    onOpenChange(false);
  }

  // The worker knows the transfer: the download has started, hand it off.
  useEffect(() => {
    if (transfer) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on hand-off
  }, [transfer]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
    } else if (!isStarting) {
      close();
    }
  }

  function handleImport() {
    const id = crypto.randomUUID();
    setError(null);
    setTransferId(id);
    importMutation.mutate(
      { code: code.trim(), transferId: id },
      {
        // Only reached while the dialog still owns the import (before the
        // hand-off): a quick failure such as an invalid code, or a tiny course
        // that finished before the first progress poll.
        onError: (importError) => {
          discardImport(id);
          setTransferId(null);
          setError(importError);
        },
        onSuccess: () => close(),
      },
    );
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{t("importCourse.title")}</DialogTitle>
          <DialogDescription>{t("importCourse.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="import-course-code">{t("importCourse.codeLabel")}</Label>
          <Input
            autoFocus
            disabled={isStarting}
            id="import-course-code"
            onChange={(event) => setCode(event.target.value)}
            placeholder={t("importCourse.codePlaceholder")}
            value={code}
          />
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t("importCourse.errorTitle")}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        <Button disabled={!code.trim() || isStarting} onClick={handleImport}>
          {isStarting && <Spinner aria-hidden="true" />}
          {isStarting ? t("importCourse.importing") : t("importCourse.importButton")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
