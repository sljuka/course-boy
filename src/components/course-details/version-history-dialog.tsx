import { useState } from "react";
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
import { CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCourseVersionHistoryQuery,
  useCutCourseVersionMutation,
} from "@/lib/course-queries";
import { nextCourseVersion, type CourseVersionReleaseType } from "@/lib/course-versioning";
import { useCommitBlockerMessage } from "@/lib/use-commit-blocker";
import { CommitReleaseNotes } from "./commit-release-notes";
import { UnusedAssetsWarning } from "./unused-assets-warning";
import { useRevertWithConfirmation } from "./use-revert-with-confirmation";
import { VersionHistoryRow } from "./version-history-row";

type ReleaseType = Exclude<CourseVersionReleaseType, "initial">;

type VersionHistoryDialogProps = {
  courseId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  // "editor" is the Commit dialog (the editor's "Commit new version"): only
  // committing — release notes, bump type, Cut. Publishing and reverting live
  // in the editor's Versions panel. "history" (the course details page's
  // "Version history") lists the cut versions with Revert; a bundled course
  // (no `draft/`) can't commit or publish anyway.
  mode: "editor" | "history";
  // "editor" only: the action bar's Publish while there are uncommitted
  // changes. The button reads "Commit x.y.z and publish", and `onCommitted`
  // gets the new version so the caller publishes it.
  onCommitted?: (version: string) => void;
  publishAfterCommit?: boolean;
};

export function VersionHistoryDialog({
  courseId,
  onOpenChange,
  open,
  mode,
  onCommitted,
  publishAfterCommit = false,
}: VersionHistoryDialogProps) {
  const { t } = useTranslation();
  const [releaseType, setReleaseType] = useState<ReleaseType>("patch");
  const [notes, setNotes] = useState("");
  const [recommended, setRecommended] = useState(false);
  const { data: history } = useCourseVersionHistoryQuery(open ? courseId : undefined);
  const cutMutation = useCutCourseVersionMutation();
  // A version needs sections with content; a draft doesn't (see getCommitBlocker).
  const commitBlocker = useCommitBlockerMessage(courseId);
  const { confirmationDialog, requestRevert, revertMutation } = useRevertWithConfirmation(courseId);
  const canCut = mode === "editor";
  // The version each bump type would create, as the cut computes it.
  const nextVersionFor = (type: ReleaseType) =>
    history ? nextCourseVersion(history.currentDraftVersion, history.versions[0]?.version ?? null, type) : null;
  const releaseTypeLabel = (type: ReleaseType) => {
    const name = t(`courseVersions.releaseType${type[0].toUpperCase()}${type.slice(1)}`);
    const next = nextVersionFor(type);

    return next ? t("courseVersions.releaseTypeWithVersion", { name, version: next }) : name;
  };

  const isBusy = (canCut && cutMutation.isPending) || revertMutation.isPending;
  const activeError = (canCut ? cutMutation.error : undefined) ?? revertMutation.error;

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isBusy) {
          return;
        }

        cutMutation.reset();
        revertMutation.reset();
        onOpenChange(nextOpen);
      }}
      open={open}
    >
      <DialogContent className="max-h-[calc(100vh-4rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {canCut
              ? publishAfterCommit
                ? t("courseVersions.commitAndPublishTitle")
                : t("courseVersions.commitButton")
              : t("courseVersions.title")}
          </DialogTitle>
          <DialogDescription>
            {t("courseVersions.currentDraftVersion", {
              version: history?.currentDraftVersion ?? "",
            })}
          </DialogDescription>
        </DialogHeader>
        {canCut && commitBlocker && (
          <Alert variant="warning">
            <AlertTitle>{t("courseVersions.commitBlockedTitle")}</AlertTitle>
            <AlertDescription>{commitBlocker}</AlertDescription>
          </Alert>
        )}
        {canCut && (
          <CommitReleaseNotes
            courseId={courseId}
            notes={notes}
            onNotesChange={setNotes}
            onRecommendedChange={setRecommended}
            open={open}
            recommended={recommended}
          />
        )}
        {canCut && <UnusedAssetsWarning courseId={courseId} open={open} />}
        {canCut && (
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>{t("courseVersions.releaseTypeLabel")}</Label>
              <Select
                onValueChange={(value) => setReleaseType(value as ReleaseType)}
                value={releaseType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{releaseTypeLabel(releaseType)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(["patch", "minor", "major"] as const).map((type) => (
                    <SelectItem key={type} value={type}>
                      {releaseTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={cutMutation.isPending || commitBlocker !== null}
              onClick={() =>
                cutMutation.mutate(
                  { courseId, notes, recommended, releaseType },
                  {
                    onSuccess: (result) => {
                      setNotes("");
                      setRecommended(false);
                      onOpenChange(false);
                      onCommitted?.(result.version);
                    },
                  },
                )
              }
            >
              {cutMutation.isPending
                ? t("courseVersions.cutting")
                : publishAfterCommit
                  ? t("courseVersions.commitAndPublishButton", { version: nextVersionFor(releaseType) ?? "" })
                  : nextVersionFor(releaseType)
                    ? t("courseVersions.cutButtonWithVersion", { version: nextVersionFor(releaseType) })
                    : t("courseVersions.cutButton")}
            </Button>
          </div>
        )}
        {activeError && (
          <Alert variant="destructive">
            <AlertTitle>{t("courseVersions.actionErrorTitle")}</AlertTitle>
            <AlertDescription>{activeError.message}</AlertDescription>
          </Alert>
        )}
        {/* The Commit dialog is only for committing; publishing and reverting
            live in the Versions panel. The history dialog lists versions. */}
        {!canCut && (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {history?.versions.length ? (
              history.versions.map((entry) => (
                <VersionHistoryRow
                  entry={entry}
                  isActive={entry.version === history.currentDraftVersion}
                  isRevertPending={
                    revertMutation.isPending &&
                    revertMutation.variables?.version === entry.version
                  }
                  key={entry.version}
                  onRevert={() => requestRevert(entry.version)}
                />
              ))
            ) : (
              <CardDescription>{t("courseVersions.emptyState")}</CardDescription>
            )}
          </div>
        )}
        {confirmationDialog}
      </DialogContent>
    </Dialog>
  );
}
