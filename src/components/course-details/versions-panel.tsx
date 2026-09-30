import { MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useState } from "react";
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
  useCourseDetailsQuery,
  useCourseVersionHistoryQuery,
  usePublishCourseVersionMutation,
  useRevertCourseDraftMutation,
} from "@/lib/course-queries";
import { formatShortDate } from "@/lib/format-date";
import { useAppState } from "@/lib/use-app-state";
import { VersionHistoryDialog } from "./version-history-dialog";

// The course editor's right panel. A Draft row first (like Git's working copy:
// "Changes since 0.1.3" or "Same as 0.1.3"), then every cut version, newest
// first. The version the draft is based on is highlighted and marked Current —
// after a revert that's an older one; the published one has its own badge.
// Revert / Publish live in each row's menu. "+" and the Draft row's menu open
// the same Commit dialog as the action bar, from any page of the editor.
export function VersionsPanel({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: history, refetch: refetchHistory } = useCourseVersionHistoryQuery(courseId);
  // Edits refresh the course details, not the history; refetch it with them so
  // the Draft row's "Same as" / "Changes since" follows every save.
  const { dataUpdatedAt: courseUpdatedAt } = useCourseDetailsQuery(courseId, locale);

  useEffect(() => {
    if (courseUpdatedAt) {
      void refetchHistory();
    }
  }, [courseUpdatedAt, refetchHistory]);
  const revertMutation = useRevertCourseDraftMutation();
  const publishMutation = usePublishCourseVersionMutation();
  const [isCommitOpen, setIsCommitOpen] = useState(false);
  const error = revertMutation.error ?? publishMutation.error;
  const versions = history?.versions ?? [];
  // Anything not yet in a version: no version at all, or the draft differs
  // from the one it's based on.
  const hasUncommittedChanges =
    Boolean(history) && (versions.length === 0 || !history?.draftMatchesCurrentVersion);

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
      <ListRow className="h-9 gap-2 px-1.5">
        <StatusIcon status={hasUncommittedChanges ? "changed" : "local"} />
        <span className="shrink-0 font-medium">{t("courseVersions.draftRow")}</span>
        <ListRowMeta emphasized={hasUncommittedChanges} fill>
          {versions.length === 0 || !history
            ? t("courseVersions.draftNotCommitted")
            : history.draftMatchesCurrentVersion
              ? t("courseVersions.draftSameAs", { version: history.currentDraftVersion })
              : t("courseVersions.draftChangesSince", { version: history.currentDraftVersion })}
        </ListRowMeta>
        <ListRowActions>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label={t("courseVersions.draftMenuLabel")}
                  size="icon-xs"
                  variant="ghost"
                />
              }
            >
              <MoreHorizontal aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setIsCommitOpen(true)}>
                {t("courseVersions.commitButton")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ListRowActions>
      </ListRow>
      {versions.length === 0 ? (
        <CardDescription className="px-1.5 py-2">{t("courseVersions.emptyState")}</CardDescription>
      ) : (
        versions.map((entry) => {
          const isDraftBase = entry.version === history?.currentDraftVersion;

          return (
            <ListRow className="h-9 gap-2 px-1.5" key={entry.version} selected={isDraftBase}>
              <StatusIcon status={entry.isCurrentlyPublished ? "published" : "local"} />
              <span className="shrink-0 font-medium">{entry.version}</span>
              {isDraftBase && <Badge variant="outline">{t("courseVersions.activeBadge")}</Badge>}
              {entry.isCurrentlyPublished && (
                <Badge variant="secondary">{t("courseVersions.publishedBadge")}</Badge>
              )}
              {entry.cutAt && (
                <ListRowMeta className="ml-auto" title={new Date(entry.cutAt).toLocaleString(locale)}>
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
