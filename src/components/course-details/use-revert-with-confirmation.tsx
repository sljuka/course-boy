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
export function useRevertWithConfirmation(courseId: string): {
  confirmationDialog: ReactNode;
  requestRevert: (version: string) => void;
  revertMutation: ReturnType<typeof useRevertCourseDraftMutation>;
} {
  const { t } = useTranslation();
  const { data: history } = useCourseVersionHistoryQuery(courseId);
  const revertMutation = useRevertCourseDraftMutation();
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const hasUncommittedChanges =
    Boolean(history) && (history!.versions.length === 0 || !history!.draftMatchesCurrentVersion);

  function revert(version: string) {
    revertMutation.mutate({ courseId, version }, { onSettled: () => setPendingVersion(null) });
  }

  const confirmationDialog = (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !revertMutation.isPending) {
          setPendingVersion(null);
        }
      }}
      open={pendingVersion !== null}
    >
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>
            {t("courseVersions.confirmRevertTitle", { version: pendingVersion ?? "" })}
          </DialogTitle>
          <DialogDescription>
            {t("courseVersions.confirmRevertDescription", {
              version: history?.currentDraftVersion ?? "",
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setPendingVersion(null)} variant="secondary">
            {t("courseVersions.cancel")}
          </Button>
          <Button
            disabled={revertMutation.isPending}
            onClick={() => pendingVersion && revert(pendingVersion)}
            variant="destructive"
          >
            {revertMutation.isPending
              ? t("courseVersions.reverting")
              : t("courseVersions.confirmRevertButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    confirmationDialog,
    requestRevert: (version) => (hasUncommittedChanges ? setPendingVersion(version) : revert(version)),
    revertMutation,
  };
}
