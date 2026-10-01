import { FileText, History, Plus, Trash2, Undo2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ListRow, ListRowMeta } from "@/components/ui/list-row";
import { PanelCard } from "@/components/ui/panel-card";
import { StatusIcon } from "@/components/ui/status-icon";
import {
  useCourseDetailsQuery,
  useCourseVersionHistoryQuery,
  usePublishCourseVersionMutation,
} from "@/lib/course-queries";
import { formatShortDate } from "@/lib/format-date";
import { useAppState } from "@/lib/use-app-state";
import { useRevertWithConfirmation } from "./use-revert-with-confirmation";
import { ReleaseNotesDialog } from "./release-notes-dialog";
import { VersionHistoryDialog } from "./version-history-dialog";

// The course editor's right panel. A Draft row first while there are
// uncommitted changes (like Git's working copy: "Changes since 0.1.3", or "Not
// committed yet" before the first version), then every cut version, newest
// first. The version the draft is based on is highlighted and marked Current —
// after a revert that's an older one; the published one has its own badge.
// Revert / Publish are in each row's context menu (right-click, like the
// explorer). "+" and the Draft row's context menu open the same Commit dialog
// as the action bar, from any page of the editor.
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
  const { confirmationDialog, requestDiscard, requestRevert, revertMutation } =
    useRevertWithConfirmation(courseId);
  const publishMutation = usePublishCourseVersionMutation();
  const [isCommitOpen, setIsCommitOpen] = useState(false);
  const error = revertMutation.error ?? publishMutation.error;
  const versions = history?.versions ?? [];
  // Release notes per version (SLJ-27), opened from a row's context menu in a
  // dialog (inline expansion doesn't scale to many versions with long notes).
  const changelogByVersion = new Map((history?.changelog ?? []).map((entry) => [entry.version, entry]));
  const [notesVersion, setNotesVersion] = useState<string | null>(null);
  // Anything not yet in a version: no version at all, or the draft differs
  // from the one it's based on.
  const hasUncommittedChanges =
    Boolean(history) && (versions.length === 0 || !history?.draftMatchesCurrentVersion);

  return (
    <PanelCard
      action={
        <Button
          aria-label={t("courseVersions.commitButton")}
          // Nothing to commit without changes, like the action bar's button.
          disabled={!hasUncommittedChanges}
          onClick={() => setIsCommitOpen(true)}
          size="icon-xs"
          title={
            hasUncommittedChanges
              ? t("courseVersions.commitButton")
              : t("courseVersions.noChangesTooltip")
          }
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
      {/* Only while there's something to commit: with no changes the highlighted
          Current version already says where the draft is. */}
      {hasUncommittedChanges && (
        <ContextMenu>
          <ContextMenuTrigger>
            <ListRow className="h-9 gap-2 px-1.5">
              <StatusIcon status="changed" />
              <span className="shrink-0 font-medium">{t("courseVersions.draftRow")}</span>
              <ListRowMeta emphasized fill>
                {versions.length === 0 || !history
                  ? t("courseVersions.draftNotCommitted")
                  : t("courseVersions.draftChangesSince", { version: history.currentDraftVersion })}
              </ListRowMeta>
            </ListRow>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            <ContextMenuItem onClick={() => setIsCommitOpen(true)}>
              <History aria-hidden="true" />
              {t("courseVersions.commitButton")}
            </ContextMenuItem>
            <ContextMenuItem
              disabled={versions.length === 0 || revertMutation.isPending}
              onClick={requestDiscard}
              variant="destructive"
            >
              <Trash2 aria-hidden="true" />
              {t("courseVersions.discardChanges")}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
      {versions.length === 0 ? (
        <CardDescription className="px-1.5 py-2">{t("courseVersions.emptyState")}</CardDescription>
      ) : (
        versions.map((entry) => {
          const isDraftBase = entry.version === history?.currentDraftVersion;
          const notes = changelogByVersion.get(entry.version);

          return (
            <ContextMenu key={entry.version}>
              <ContextMenuTrigger>
                <ListRow className="h-9 gap-2 px-1.5" selected={isDraftBase}>
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
                </ListRow>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-52">
                <ContextMenuItem disabled={!notes} onClick={() => setNotesVersion(entry.version)}>
                  <FileText aria-hidden="true" />
                  {t("courseVersions.showReleaseNotes")}
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={isDraftBase || revertMutation.isPending}
                  onClick={() => requestRevert(entry.version)}
                >
                  <Undo2 aria-hidden="true" />
                  {t("courseVersions.revertButton")}
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={entry.isEverPublished || publishMutation.isPending}
                  onClick={() => publishMutation.mutate({ courseId, version: entry.version })}
                >
                  <Upload aria-hidden="true" />
                  {t("courseVersions.publishButton")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })
      )}
      {confirmationDialog}
      <ReleaseNotesDialog
        entry={notesVersion ? (changelogByVersion.get(notesVersion) ?? null) : null}
        onClose={() => setNotesVersion(null)}
      />
      <VersionHistoryDialog
        courseId={courseId}
        mode="editor"
        onOpenChange={setIsCommitOpen}
        open={isCommitOpen}
      />
    </PanelCard>
  );
}
