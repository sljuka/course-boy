import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { FoundCodeCard } from "@/components/course-search/found-code-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { shareCodeFromText } from "@/lib/app-links";
import { usePublishersQuery } from "@/lib/publishers-queries";
import {
  discardImport,
  useFindCodeQuery,
  useImportCourseMutation,
  useTransferQuery,
} from "@/lib/sharing-queries";
import { transferErrorText } from "@/lib/transfer-errors";
import { useAppState } from "@/lib/use-app-state";

type ImportCourseDialogProps = {
  // A code from a `matko://import/…` link (SLJ-8): filled in, never imported
  // by itself, with a word about where it came from.
  initialCode?: string | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

// Takes a code (a course's, a program's or a channel's), finds what it is,
// and imports it. Finding (SLJ-153) reads the code's manifest and listing
// from people sharing it, so the student sees what they're about to download
// (`FoundCodeCard`) before anything is: a typed or pasted code is found as
// soon as it's whole; a code from a link only on "Find" (SLJ-151), since
// finding contacts those people and a link alone must never reach the
// network. Over a download limit, there's nothing to import; nobody online,
// it can be imported anyway (it waits for them).
//
// Importing doesn't wait for the download (SLJ-49): once the worker has the
// transfer, the dialog closes and Home lists it under Downloading until it
// lands. An error before that is shown here.
export function ImportCourseDialog({ initialCode = null, onOpenChange, open }: ImportCourseDialogProps) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const [code, setCode] = useState("");
  // A link's code: found only once the student asks.
  const [isFindRequested, setIsFindRequested] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // The import being started, until it's handed off to Home.
  const [transferId, setTransferId] = useState<string | null>(null);
  const importMutation = useImportCourseMutation();
  const { data: transfer } = useTransferQuery(transferId);
  const { data: publishers } = usePublishersQuery();
  const isStarting = transferId !== null;

  // A code, or a share link pasted whole (its code is used).
  const pastedCode = shareCodeFromText(code);
  const normalizedCode = pastedCode ?? "";
  const isValidCode = pastedCode !== null;
  const isFromLink = Boolean(initialCode) && normalizedCode === initialCode?.toLowerCase();
  const shouldFind = open && isValidCode && (!isFromLink || isFindRequested);
  const find = useFindCodeQuery(shouldFind ? normalizedCode : null);
  const found = shouldFind ? find.data : undefined;

  function close() {
    setCode("");
    setError(null);
    setTransferId(null);
    setIsFindRequested(false);
    // Detaches this dialog from the import; it keeps running for Home.
    importMutation.reset();
    onOpenChange(false);
  }

  // Opened from a link: its code, waiting for Find. Another link's code
  // replaces the first.
  useEffect(() => {
    if (open && initialCode) {
      setCode(initialCode);
      setIsFindRequested(false);
    }
  }, [initialCode, open]);

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
      { code: normalizedCode, transferId: id },
      {
        // Only reached while the dialog still owns the import (before the
        // hand-off): a quick failure, or a tiny course that finished before
        // the first progress poll.
        onError: (importError) => {
          discardImport(id);
          setTransferId(null);
          setError(importError);
        },
        onSuccess: () => close(),
      },
    );
  }

  // What the student can do now: find (a link's code), import (found, or
  // nobody online), or nothing (finding, not Matko's, over a limit).
  const canImport =
    (found?.status === "found" && !found.contents?.limit) || found?.status === "nobody-online";
  const importLabel =
    found?.status === "found"
      ? t(`importCourse.find.import.${found.kind}`)
      : t("importCourse.find.importAnyway");

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="w-[min(36rem,calc(100vw-2rem))] sm:max-w-[36rem]">
        <DialogHeader>
          <DialogTitle>{t("importCourse.title")}</DialogTitle>
          <DialogDescription>{t("importCourse.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="import-course-code">{t("importCourse.codeLabel")}</Label>
          <Input
            aria-invalid={code.trim() !== "" && !isValidCode}
            autoFocus
            data-testid="import-course-code"
            disabled={isStarting}
            id="import-course-code"
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            placeholder={t("importCourse.codePlaceholder")}
            value={code}
          />
          {code.trim() !== "" && !isValidCode && (
            <FieldError data-testid="import-code-invalid">{t("importCourse.find.invalid")}</FieldError>
          )}
        </div>
        {isFromLink && (
          <Alert data-testid="import-from-link" variant="info">
            <AlertDescription>{t("importCourse.fromLink")}</AlertDescription>
          </Alert>
        )}

        {shouldFind && find.isFetching && !found && (
          <div className="flex items-center gap-2" data-testid="import-finding">
            <Spinner aria-hidden="true" />
            <CardDescription>{t("importCourse.find.finding")}</CardDescription>
          </div>
        )}
        {found?.status === "found" && (
          <FoundCodeCard
            found={found}
            isKnownPublisher={Boolean(publishers?.some((entry) => entry.publisherId === found.publisherId))}
            locale={locale}
          />
        )}
        {found?.status === "nobody-online" && (
          <Alert data-testid="found-code-nobody-online" variant="warning">
            <AlertDescription>{t("importCourse.find.nobodyOnline")}</AlertDescription>
          </Alert>
        )}
        {found?.status === "not-matko" && (
          <Alert data-testid="found-code-not-matko" variant="destructive">
            <AlertDescription>{t("importCourse.find.notMatko")}</AlertDescription>
          </Alert>
        )}
        {find.isError && (
          <Alert variant="destructive">
            <AlertDescription>{transferErrorText(find.error, t)}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t("importCourse.errorTitle")}</AlertTitle>
            <AlertDescription>{transferErrorText(error, t)}</AlertDescription>
          </Alert>
        )}

        {isFromLink && isValidCode && !isFindRequested ? (
          <Button data-testid="import-find" onClick={() => setIsFindRequested(true)}>
            {t("importCourse.find.button")}
          </Button>
        ) : (
          canImport && (
            <Button data-testid="import-confirm" disabled={isStarting} onClick={handleImport}>
              {isStarting && <Spinner aria-hidden="true" />}
              {isStarting ? t("importCourse.importing") : importLabel}
            </Button>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
