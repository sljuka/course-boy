import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CopyableCode } from "@/components/copyable-code";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { PublisherEntry } from "@/lib/publishers";
import { useRemovePublisherMutation, useSavePublisherMutation } from "@/lib/publishers-queries";

const MAX_LABEL_LENGTH = 80;

// One publisher in the address book (SLJ-108): a new one, entered by hand
// (their Publisher ID and a name), or an existing one (its id to copy, its
// name to change, and Remove). The name is only what you call them: it proves
// nothing about who they are.
export function PublisherDialog({
  entry,
  onClose,
  open,
}: {
  // Unset: adding a publisher.
  entry?: PublisherEntry;
  onClose: () => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const [publisherId, setPublisherId] = useState(entry?.publisherId ?? "");
  const [label, setLabel] = useState(entry?.label ?? "");
  const saveMutation = useSavePublisherMutation();
  const removeMutation = useRemovePublisherMutation();
  const isBusy = saveMutation.isPending || removeMutation.isPending;
  const error = saveMutation.error ?? removeMutation.error;
  const trimmedId = publisherId.trim();

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && !isBusy && onClose()} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" data-testid="publisher-dialog">
        <DialogHeader>
          <DialogTitle>{entry ? t("publishers.editTitle") : t("publishers.addTitle")}</DialogTitle>
          <DialogDescription>{entry ? t("publishers.editDescription") : t("publishers.addDescription")}</DialogDescription>
        </DialogHeader>
        {entry ? (
          <CopyableCode label={t("publishers.publisherId")} testId="publisher-id" value={entry.publisherId} />
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publisher-new-id">{t("publishers.publisherId")}</Label>
            <Input
              autoFocus
              data-testid="publisher-new-id"
              disabled={isBusy}
              id="publisher-new-id"
              onChange={(event) => setPublisherId(event.target.value)}
              value={publisherId}
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="publisher-label">{t("publishers.label")}</Label>
          <Input
            data-testid="publisher-label"
            disabled={isBusy}
            id="publisher-label"
            maxLength={MAX_LABEL_LENGTH}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t("publishers.labelPlaceholder")}
            value={label}
          />
          <CardDescription>{t("publishers.labelHint")}</CardDescription>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          {entry && (
            <Button
              data-testid="publisher-remove"
              disabled={isBusy}
              onClick={() => removeMutation.mutate(entry.publisherId, { onSuccess: onClose })}
              variant="destructive"
            >
              {t("publishers.remove")}
            </Button>
          )}
          <Button disabled={isBusy} onClick={onClose} variant="secondary">
            {t("publishers.cancel")}
          </Button>
          <Button
            data-testid="publisher-save"
            disabled={isBusy || !trimmedId}
            onClick={() => saveMutation.mutate({ label: label.trim() || null, publisherId: trimmedId }, { onSuccess: onClose })}
          >
            {saveMutation.isPending && <Spinner aria-hidden="true" />}
            {t("publishers.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
