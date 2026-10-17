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

// "Publish version 0.4?": asked before a version goes online, since students
// who download it keep it. A course maintained with others (SLJ-11) asks
// them for approval instead. `version`: the one asked about, or null (closed).
export function ConfirmPublishDialog({
  isShared,
  onCancel,
  onConfirm,
  version,
}: {
  isShared: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  version: string | null;
}) {
  const { t } = useTranslation();

  return (
    <Dialog onOpenChange={(open) => !open && onCancel()} open={version !== null}>
      <DialogContent className="w-[min(30rem,calc(100vw-2rem))]" data-testid="confirm-publish-dialog">
        <DialogHeader>
          <DialogTitle>
            {isShared
              ? t("courseVersions.confirmAskApprovalTitle", { version: version ?? "" })
              : t("courseVersions.confirmPublishTitle", { version: version ?? "" })}
          </DialogTitle>
          <DialogDescription>
            {isShared ? t("courseVersions.confirmAskApprovalDescription") : t("courseVersions.confirmPublishDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onCancel} variant="secondary">
            {t("courseVersions.cancel")}
          </Button>
          <Button autoFocus data-testid="confirm-publish" onClick={onConfirm}>
            {isShared ? t("maintainers.askApprovalShort") : t("courseVersions.publishButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
