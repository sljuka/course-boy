import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListRow, ListRowActions, ListRowMeta } from "@/components/ui/list-row";
import { PanelCard } from "@/components/ui/panel-card";
import { StatusIcon } from "@/components/ui/status-icon";
import {
  useCourseVersionHistoryQuery,
  usePublishCourseVersionMutation,
  useRevertCourseDraftMutation,
} from "@/lib/course-queries";
import { formatShortDate } from "@/lib/format-date";
import { useAppState } from "@/lib/use-app-state";
import { VersionHistoryDialog } from "./version-history-dialog";

// The course editor's right panel: every cut version, newest first, with the
// published one marked, and Revert / Publish in each row's menu. "+" opens the
// same Commit dialog as the action bar, from any page of the editor.
export function VersionsPanel({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: history } = useCourseVersionHistoryQuery(courseId);
  const revertMutation = useRevertCourseDraftMutation();
  const publishMutation = usePublishCourseVersionMutation();
  const [isCommitOpen, setIsCommitOpen] = useState(false);
  const error = revertMutation.error ?? publishMutation.error;
  const versions = history?.versions ?? [];

  return (
    <PanelCard
      action={
        <Button
          aria-label={t("courseVersions.commitButton")}
          onClick={() => setIsCommitOpen(true)}
          size="icon-xs"
          title={t("courseVersions.commitButton")}
          variant="ghost"
        >
          <Plus aria-hidden="true" />
        </Button>
      }
      title={t("courseVersions.panelTitle")}
    >
      {error && (
        <Alert className="mb-1.5" variant="destructive">
          <AlertTitle>{t("courseVersions.actionErrorTitle")}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      {versions.length === 0 ? (
        <CardDescription className="px-1.5 py-2">{t("courseVersions.emptyState")}</CardDescription>
      ) : (
        [...versions].reverse().map((entry) => {
          const isDraftBase = entry.version === history?.currentDraftVersion;

          return (
            <ListRow className="h-9 gap-2 px-1.5" key={entry.version}>
              <StatusIcon status={entry.isCurrentlyPublished ? "published" : "local"} />
              <span className="min-w-0 flex-1 truncate font-medium">{entry.version}</span>
              {entry.isCurrentlyPublished && (
                <Badge variant="secondary">{t("courseVersions.publishedBadge")}</Badge>
              )}
              {entry.cutAt && (
                <ListRowMeta title={new Date(entry.cutAt).toLocaleString(locale)}>
                  {formatShortDate(entry.cutAt, locale)}
                </ListRowMeta>
              )}
              <ListRowActions>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        aria-label={t("courseVersions.versionMenuLabel", { version: entry.version })}
                        size="icon-xs"
                        variant="ghost"
                      />
                    }
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      disabled={isDraftBase || revertMutation.isPending}
                      onClick={() => revertMutation.mutate({ courseId, version: entry.version })}
                    >
                      {t("courseVersions.revertButton")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={entry.isEverPublished || publishMutation.isPending}
                      onClick={() => publishMutation.mutate({ courseId, version: entry.version })}
                    >
                      {t("courseVersions.publishButton")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ListRowActions>
            </ListRow>
          );
        })
      )}
      <VersionHistoryDialog
        courseId={courseId}
        mode="editor"
        onOpenChange={setIsCommitOpen}
        open={isCommitOpen}
      />
    </PanelCard>
  );
}
