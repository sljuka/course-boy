import { Upload } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCourseVersionHistoryQuery } from "@/lib/course-queries";
import { useCommitBlockerMessage } from "@/lib/use-commit-blocker";
import { usePublishWithConsent } from "./use-publish-with-consent";
import { VersionHistoryDialog } from "./version-history-dialog";

// The editor's one-step Publish, as a round icon button in the action bar:
// - uncommitted changes: "Commit new version from drafts and publish" opens
//   the Commit dialog, then publishes the version it cuts;
// - no changes: "Publish" publishes the version the draft is (unless it's
//   already the published one);
// - a structure a version doesn't allow (an empty section): disabled, with
//   the reason. Commit on its own is in the course's ⋯ menu; the Versions
//   panel still publishes or reverts any version.
export function PublishCourseButton({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: history } = useCourseVersionHistoryQuery(courseId);
  const commitBlocker = useCommitBlockerMessage(courseId);
  const { dialogs, publishMutation, requestPublish } = usePublishWithConsent(courseId);
  const [isCommitOpen, setIsCommitOpen] = useState(false);

  const hasChanges = Boolean(history) && (history!.versions.length === 0 || !history!.draftMatchesCurrentVersion);
  const isPublished = Boolean(history) && !hasChanges && history!.publishedVersion === history!.currentDraftVersion;

  const label = !history
    ? t("courseVersions.publishButton")
    : hasChanges
      ? commitBlocker ?? t("courseVersions.commitAndPublishAction")
      : isPublished
        ? t("courseVersions.alreadyPublished", { version: history.currentDraftVersion })
        : t("courseVersions.publishButton");
  const isDisabled =
    !history || publishMutation.isPending || (hasChanges ? commitBlocker !== null : isPublished);

  function handleClick() {
    if (!history) return;

    if (hasChanges) {
      setIsCommitOpen(true);
    } else {
      requestPublish(history.currentDraftVersion);
    }
  }

  return (
    <>
      <Tooltip>
        {/* A disabled button gets no hover events: the span shows the reason. */}
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            aria-label={label}
            data-testid="publish-course"
            disabled={isDisabled}
            onClick={handleClick}
            shape="circle"
            size="icon-sm"
          >
            {publishMutation.isPending ? <Spinner aria-hidden="true" /> : <Upload aria-hidden="true" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <VersionHistoryDialog
        courseId={courseId}
        mode="editor"
        onCommitted={requestPublish}
        onOpenChange={setIsCommitOpen}
        open={isCommitOpen}
        publishAfterCommit
      />
      {dialogs}
    </>
  );
}
