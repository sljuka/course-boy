import { CheckCheck, FileMinus, FilePen, FilePlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { Page } from "@/components/page/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ListRow, ListRowMeta } from "@/components/ui/list-row";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useApproveMutation, useProposalReviewQuery, useRequestChangesMutation } from "@/lib/maintainers-queries";

const CHANGE_ICONS = { added: FilePlus, changed: FilePen, removed: FileMinus } as const;

// One proposed version's review (SLJ-11): which files it adds, changes or
// removes compared with the course online now (only those were downloaded),
// then Approve, or Ask for changes with a note to the maintainer who
// proposed it. Approving is checked again: it must build on the course's
// latest version, and you never approve two versions for the same spot.
export function ApprovalReviewPage() {
  const { hash, publicId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: review, error, isLoading } = useProposalReviewQuery(publicId, hash);
  const approveMutation = useApproveMutation();
  const changesMutation = useRequestChangesMutation();
  const [note, setNote] = useState("");
  const isBusy = approveMutation.isPending || changesMutation.isPending;
  const done = () => navigate("/approvals");

  return (
    <Page
      breadcrumbs={[
        { icon: CheckCheck, label: t("sidebar.approvals"), to: "/approvals" },
        { icon: CheckCheck, label: review ? t("maintainers.versionTitle", { version: review.version }) : "…" },
      ]}
      header={
        <div className="flex flex-col gap-1">
          <CardTitle size="lg">
            {review ? t("maintainers.reviewTitle", { version: review.version }) : t("maintainers.reviewLoading")}
          </CardTitle>
          <CardDescription className="max-w-3xl">{t("maintainers.reviewDescription")}</CardDescription>
        </div>
      }
    >
      <div className="flex max-w-3xl flex-col gap-4" data-testid="approval-review">
        {isLoading && <Spinner aria-hidden="true" />}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {review && (
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
        )}
        {(approveMutation.error || changesMutation.error) && (
          <Alert variant="destructive">
            <AlertDescription>{(approveMutation.error ?? changesMutation.error)?.message}</AlertDescription>
          </Alert>
        )}
        {review && publicId && hash && (
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
