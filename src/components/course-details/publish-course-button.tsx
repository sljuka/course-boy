import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCourseVersionHistoryQuery } from "@/lib/course-queries";
import { usePublishWithConsent } from "./use-publish-with-consent";

// The editor's Publish, as a round icon button in the action bar after Commit
// new version: it publishes the newest committed version, unless that one is
// already the published one. Uncommitted changes aren't included: they're
// committed first with the button before it. Disabled, with the reason, when
// there's no version yet or the newest is already published. The Versions
// panel still publishes or reverts any version.
export function PublishCourseButton({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: history } = useCourseVersionHistoryQuery(courseId);
  const { dialogs, publishMutation, requestPublish } = usePublishWithConsent(courseId);
  const newest = history?.versions[0]?.version ?? null;
  const isPublished = newest !== null && history?.publishedVersion === newest;

  const label =
    newest === null
      ? t("courseVersions.publishNeedsVersion")
      : isPublished
        ? t("courseVersions.alreadyPublished", { version: newest })
        : t("courseVersions.publishVersion", { version: newest });

  return (
    <>
      <Tooltip>
        {/* A disabled button gets no hover events: the span shows the reason. */}
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            aria-label={label}
            data-testid="publish-course"
            disabled={newest === null || isPublished || publishMutation.isPending}
            onClick={() => newest && requestPublish(newest)}
            shape="circle"
            size="icon-sm"
            variant="secondary"
          >
            {publishMutation.isPending ? <Spinner aria-hidden="true" /> : <Upload aria-hidden="true" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      {dialogs}
    </>
  );
}
