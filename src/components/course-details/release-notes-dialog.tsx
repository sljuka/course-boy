import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CourseChangelogEntry } from "@/lib/course-package";
import { useAppState } from "@/lib/use-app-state";
import { VersionNotes } from "./version-notes";

// One version's release notes (SLJ-27), opened from the Versions panel's
// context menu: "Recommended update", the author's notes, then the changes.
export function ReleaseNotesDialog({
  entry,
  onClose,
}: {
  entry: CourseChangelogEntry | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { locale } = useAppState();

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={entry !== null}>
      <DialogContent className="max-h-[calc(100vh-4rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("courseVersions.releaseNotesTitle", { version: entry?.version ?? "" })}</DialogTitle>
          {entry?.cutAt && (
            <DialogDescription>{new Date(entry.cutAt).toLocaleString(locale)}</DialogDescription>
          )}
        </DialogHeader>
        {entry && <VersionNotes entry={entry} />}
      </DialogContent>
    </Dialog>
  );
}
