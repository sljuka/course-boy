import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCourseVersionHistoryQuery, useRevertCourseDraftMutation } from "@/lib/course-queries";

// Reverting replaces the draft. When the draft has uncommitted changes those
// would be lost, so ask first; otherwise nothing can be lost (every version
// stays on disk) and it reverts directly. Shared by the Versions panel and the
// version history dialog.
//
// Discarding changes is a revert to the version the draft is based on: it
// always asks (it only makes sense when there are changes) and says so.
type PendingAction = { kind: "discard" | "revert"; version: string };

export function useRevertWithConfirmation(courseId: string): {
  confirmationDialog: ReactNode;
  requestDiscard: () => void;
  requestRevert: (version: string) => void;
  revertMutation: ReturnType<typeof useRevertCourseDraftMutation>;
} {
  const { t } = useTranslation();
  const { data: history } = useCourseVersionHistoryQuery(courseId);
  const revertMutation = useRevertCourseDraftMutation();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const hasUncommittedChanges =
    Boolean(history) && (history!.versions.length === 0 || !history!.draftMatchesCurrentVersion);

  function revert(version: string) {
    revertMutation.mutate({ courseId, version }, { onSettled: () => setPending(null) });
  }

  const confirmationDialog = (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !revertMutation.isPending) {
          setPending(null);
        }
      }}
      open={pending !== null}
    >
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>
            {pending?.kind === "discard"
              ? t("courseVersions.confirmDiscardTitle", { version: pending.version })
              : t("courseVersions.confirmRevertTitle", { version: pending?.version ?? "" })}
          </DialogTitle>
          <DialogDescription>
            {pending?.kind === "discard"
              ? t("courseVersions.confirmDiscardDescription", { version: pending.version })
              : t("courseVersions.confirmRevertDescription", {
                  version: history?.currentDraftVersion ?? "",
                })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setPending(null)} variant="secondary">
            {t("courseVersions.cancel")}
          </Button>
          <Button
            disabled={revertMutation.isPending}
            onClick={() => pending && revert(pending.version)}
            variant="destructive"
          >
            {revertMutation.isPending
              ? t("courseVersions.reverting")
              : pending?.kind === "discard"
                ? t("courseVersions.confirmDiscardButton")
                : t("courseVersions.confirmRevertButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    confirmationDialog,
    requestDiscard: () => {
      if (history && history.versions.length > 0) {
        setPending({ kind: "discard", version: history.currentDraftVersion });
      }
    },
    requestRevert: (version) =>
      hasUncommittedChanges ? setPending({ kind: "revert", version }) : revert(version),
    revertMutation,
  };
}
