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
import { Spinner } from "@/components/ui/spinner";
import type { CourseUpdateInfo } from "@/lib/sharing";
import { VersionNotes } from "./version-notes";

// What an update brings: the release notes of every version the student would
// get, newest first. Opened from "What's new", and before a big (major) update.
export function CourseUpdateDialog({
  isApplying,
  onApply,
  onClose,
  open,
  update,
}: {
  isApplying: boolean;
  onApply: () => void;
  onClose: () => void;
  open: boolean;
  update: CourseUpdateInfo;
}) {
  const { t } = useTranslation();

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && !isApplying && onClose()} open={open}>
      <DialogContent className="max-h-[calc(100vh-4rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {update.isMajor
              ? t("courseUpdates.bigUpdateTitle", { version: update.version })
              : t("courseUpdates.dialogTitle", { version: update.version })}
          </DialogTitle>
          <DialogDescription>
            {update.isMajor ? t("courseUpdates.bigUpdateDescription") : t("courseUpdates.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {update.changelog.map((entry) => (
            <div className="flex flex-col gap-1.5" key={entry.version}>
              <span className="font-medium">{entry.version}</span>
              <VersionNotes entry={entry} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button disabled={isApplying} onClick={onClose} variant="secondary">
            {t("courseUpdates.notNow")}
          </Button>
          <Button disabled={isApplying} onClick={onApply}>
            {isApplying && <Spinner aria-hidden="true" />}
            {isApplying ? t("courseUpdates.updating") : t("courseUpdates.updateTo", { version: update.version })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
