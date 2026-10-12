import { CheckCheck, Eye, FileMinus, FilePen, FilePlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { ApprovalStatus } from "@/components/approvals/approval-status";
import { ChangeSummary } from "@/components/approvals/change-summary";
import { VersionNotes } from "@/components/course-details/version-notes";
import { Page } from "@/components/page/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ListRow, ListRowMeta } from "@/components/ui/list-row";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useApprovalsQuery,
  useApproveMutation,
  useOwnPublisherIdQuery,
  usePreviewProposalMutation,
  useProposalReviewQuery,
  useRequestChangesMutation,
  useWithdrawProposalMutation,
} from "@/lib/maintainers-queries";

const CHANGE_ICONS = { added: FilePlus, changed: FilePen, removed: FileMinus } as const;

// One proposed version's review (SLJ-11, SLJ-67): its release notes since the
// version online now (the author's notes and what changed, in course terms,
// as the cut wrote them), then the files it adds, changes or removes (only
// those were downloaded; the check, since the notes come from the proposer's
// app), then Approve, or Ask for changes with a note to the maintainer who
// proposed it. Approving is checked again: it must build on the course's
// latest version, and you never approve two versions for the same spot.
// Where it stands is on top (SLJ-109). Only someone else's version still
// waiting is reviewed (its files, Preview); Approve and Ask for changes only
// while it waits for you. Yours, or one already decided, shows its status.
export function ApprovalReviewPage() {
  const { hash, publicId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: approvals, isLoading: isListLoading } = useApprovalsQuery();
  const { data: ownPublisherId = "" } = useOwnPublisherIdQuery();
  const item = approvals?.items.find((entry) => entry.publicId === publicId && entry.hash === hash);
  // A change of maintainers (SLJ-70) changes no files: its summary is the review.
  const isReviewable = Boolean(
    item &&
      !item.mine &&
      !item.change &&
      (item.group === "waiting-for-you" || item.group === "waiting-for-others" || item.group === "changes-requested"),
  );
  const canAnswer = item?.group === "waiting-for-you";
  // Yours, still waiting, and nobody else has approved it (SLJ-110).
  const canWithdraw = Boolean(
    item?.mine &&
      item.group !== "approved" &&
      item.group !== "replaced" &&
      item.approvedBy.every((id) => id === item.from) &&
      (item.change?.approvedBy ?? []).every((id) => id === item.from),
  );
  const withdrawMutation = useWithdrawProposalMutation();
  const { data: review, error, isLoading } = useProposalReviewQuery(publicId, hash, isReviewable);
  const version = review?.version ?? item?.version;
  const approveMutation = useApproveMutation();
  const changesMutation = useRequestChangesMutation();
  const previewMutation = usePreviewProposalMutation();
  const [note, setNote] = useState("");
  const isBusy = approveMutation.isPending || changesMutation.isPending;
  const done = () => navigate("/approvals");

  return (
    <Page
      breadcrumbs={[
        { icon: CheckCheck, label: t("sidebar.approvals"), to: "/approvals" },
        { icon: CheckCheck, label: version ? t("maintainers.versionTitle", { version }) : "…" },
      ]}
      header={
        <div className="flex flex-col gap-1">
          <CardTitle size="lg">
            {item?.change
              ? t("maintainers.reviewChangeTitle")
              : version
                ? t("maintainers.reviewTitle", { version })
                : t("maintainers.reviewLoading")}
          </CardTitle>
          <CardDescription className="max-w-3xl">
            {item?.change ? t("maintainers.reviewChangeDescription") : t("maintainers.reviewDescription")}
          </CardDescription>
        </div>
      }
    >
      <div className="flex max-w-3xl flex-col gap-4" data-testid="approval-review">
        {item && <ApprovalStatus item={item} ownPublisherId={ownPublisherId} />}
        {item?.change && <ChangeSummary item={item} ownPublisherId={ownPublisherId} />}
        {!isListLoading && !item && (
          <Alert variant="destructive">
            <AlertDescription>{t("maintainers.proposalGone")}</AlertDescription>
          </Alert>
        )}
        {(isLoading || isListLoading) && <Spinner aria-hidden="true" />}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {review && (
          <div className="flex flex-col gap-4" data-testid="approval-release-notes">
            {review.releaseNotes.map((entry) => (
              <div className="flex flex-col gap-2" key={entry.version}>
                <CardTitle>{t("maintainers.versionTitle", { version: entry.version })}</CardTitle>
                <VersionNotes entry={entry} />
              </div>
            ))}
            {review.releaseNotes.length === 0 && <CardDescription>{t("maintainers.noReleaseNotes")}</CardDescription>}
          </div>
        )}
        {review && (
          <Collapsible>
            <CollapsibleTrigger data-testid="approval-files">
              {t("maintainers.filesChanged", { count: review.changes.length })}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col" data-testid="approval-changes">
                {review.changes.map((change) => {
                  const Icon = CHANGE_ICONS[change.kind];
                  return (
                    <ListRow className="h-8 gap-2" key={change.path}>
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{change.path}</span>
                      <ListRowMeta>{t(`maintainers.change.${change.kind}`)}</ListRowMeta>
                    </ListRow>
                  );
                })}
                {review.changes.length === 0 && <CardDescription>{t("maintainers.noChanges")}</CardDescription>}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        {review && publicId && hash && (
          <div>
            {/* As students would see it, before approving (only changed files are downloaded). */}
            <Button
              data-testid="preview-version"
              disabled={previewMutation.isPending}
              onClick={() =>
                previewMutation.mutate({ hash, publicId }, { onSuccess: ({ courseId }) => navigate(`/courses/${courseId}`) })
              }
              variant="secondary"
            >
              {previewMutation.isPending ? <Spinner aria-hidden="true" /> : <Eye aria-hidden="true" />}
              {t("maintainers.previewButton")}
            </Button>
          </div>
        )}
        {canWithdraw && publicId && hash && (
          <div className="flex flex-col items-start gap-2">
            <CardDescription>{t("maintainers.withdrawDescription")}</CardDescription>
            <Button
              data-testid="withdraw-version"
              disabled={withdrawMutation.isPending}
              onClick={() => withdrawMutation.mutate({ hash, publicId })}
              variant="secondary"
            >
              {withdrawMutation.isPending && <Spinner aria-hidden="true" />}
              {t("maintainers.withdraw")}
            </Button>
          </div>
        )}
        {(approveMutation.error || changesMutation.error || previewMutation.error || withdrawMutation.error) && (
          <Alert variant="destructive">
            <AlertDescription>
              {(approveMutation.error ?? changesMutation.error ?? previewMutation.error ?? withdrawMutation.error)?.message}
            </AlertDescription>
          </Alert>
        )}
        {(review || item?.change) && canAnswer && publicId && hash && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="approval-note">{t("maintainers.noteLabel")}</Label>
              <Textarea
                id="approval-note"
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("maintainers.notePlaceholder")}
                value={note}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                data-testid="approve-version"
                disabled={isBusy}
                onClick={() => approveMutation.mutate({ hash, publicId }, { onSuccess: done })}
              >
                {approveMutation.isPending && <Spinner aria-hidden="true" />}
                {t("maintainers.approve")}
              </Button>
              <Button
                data-testid="request-changes"
                disabled={isBusy || !note.trim()}
                onClick={() => changesMutation.mutate({ hash, note: note.trim(), publicId }, { onSuccess: done })}
                variant="secondary"
              >
                {t("maintainers.requestChanges")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
