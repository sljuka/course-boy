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
  usePublishCourseVersionMutation,
  useRevertCourseDraftMutation,
} from "@/lib/course-queries";
import type { CourseVersionReleaseType } from "@/lib/course-versioning";
import { VersionHistoryRow } from "./version-history-row";

type ReleaseType = Exclude<CourseVersionReleaseType, "initial">;

type VersionHistoryDialogProps = {
  courseId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  // "editor" (the drafts editor's "Commit new version" button) gets the
  // full authoring workflow — cut, revert, publish. "history" (the
  // read-only course-details page's "Version history" button) only ever
  // looks at cut versions already on disk, so it's revert-only: cutting
  // and publishing are authoring actions that belong in the editor, and a
  // bundled course (no `draft/` to speak of) can't do either anyway.
  mode: "editor" | "history";
};

export function VersionHistoryDialog({
  courseId,
  onOpenChange,
  open,
  mode,
}: VersionHistoryDialogProps) {
  const { t } = useTranslation();
  const [releaseType, setReleaseType] = useState<ReleaseType>("patch");
  const { data: history } = useCourseVersionHistoryQuery(open ? courseId : undefined);
  const cutMutation = useCutCourseVersionMutation();
  const revertMutation = useRevertCourseDraftMutation();
  const publishMutation = usePublishCourseVersionMutation();
  const canCut = mode === "editor";
  const canPublish = mode === "editor";

  const isBusy =
    (canCut && cutMutation.isPending) || revertMutation.isPending || (canPublish && publishMutation.isPending);
  const activeError =
    (canCut ? cutMutation.error : undefined) ??
    revertMutation.error ??
    (canPublish ? publishMutation.error : undefined);

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isBusy) {
          return;
        }

        cutMutation.reset();
        revertMutation.reset();
        publishMutation.reset();
        onOpenChange(nextOpen);
      }}
      open={open}
    >
      <DialogContent className="w-[min(36rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{t("courseVersions.title")}</DialogTitle>
          <DialogDescription>
            {t("courseVersions.currentDraftVersion", {
              version: history?.currentDraftVersion ?? "",
            })}
          </DialogDescription>
        </DialogHeader>
        {canCut && (
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>{t("courseVersions.releaseTypeLabel")}</Label>
              <Select
                onValueChange={(value) => setReleaseType(value as ReleaseType)}
                value={releaseType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patch">{t("courseVersions.releaseTypePatch")}</SelectItem>
                  <SelectItem value="minor">{t("courseVersions.releaseTypeMinor")}</SelectItem>
                  <SelectItem value="major">{t("courseVersions.releaseTypeMajor")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={cutMutation.isPending}
              onClick={() => cutMutation.mutate({ courseId, releaseType })}
            >
              {cutMutation.isPending
                ? t("courseVersions.cutting")
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
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {history?.versions.length ? (
            history.versions.map((entry) => (
              <VersionHistoryRow
                canPublish={canPublish}
                entry={entry}
                isActive={entry.version === history.currentDraftVersion}
                isPublishPending={
                  canPublish &&
                  publishMutation.isPending &&
                  publishMutation.variables?.version === entry.version
                }
                isRevertPending={
                  revertMutation.isPending &&
                  revertMutation.variables?.version === entry.version
                }
                key={entry.version}
                onPublish={() => publishMutation.mutate({ courseId, version: entry.version })}
                onRevert={() => revertMutation.mutate({ courseId, version: entry.version })}
              />
            ))
          ) : (
            <CardDescription>{t("courseVersions.emptyState")}</CardDescription>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
