import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusIcon } from "@/components/ui/status-icon";
import type { ApprovalItem } from "@/lib/maintainers";
import { usePublisherName } from "@/lib/publishers-queries";

// Where a proposed version stands (SLJ-109), on top of its page: its group,
// who approved it out of how many needed and who hasn't yet, the notes of
// anyone who asked for changes, and the course once it went online.
export function ApprovalStatus({ item, ownPublisherId }: { item: ApprovalItem; ownPublisherId: string }) {
  const { t } = useTranslation();
  const publisherName = usePublisherName();
  const nameOf = (publisherId: string) => (publisherId === ownPublisherId ? t("maintainers.you") : publisherName(publisherId));
  const approved = Math.min(item.approvedBy.length, item.quorum);

  return (
    <Alert data-group={item.group} data-testid="approval-status-summary">
      {item.group === "approved" ? (
        <StatusIcon status="done" />
      ) : item.group === "replaced" ? (
        <StatusIcon status="canceled" />
      ) : item.group === "changes-requested" ? (
        <StatusIcon status="attention" />
      ) : (
        <StatusIcon progress={approved / item.quorum} status="pending" />
      )}
      <AlertTitle>{t(`maintainers.groups.${item.group}`)}</AlertTitle>
      <AlertDescription>
        <p>
          {item.withdrawn
            ? t("maintainers.withdrawnDescription")
            : item.group === "replaced"
            ? t("maintainers.replacedDescription")
            : t("maintainers.approvedCount", { approved, quorum: item.quorum })}
        </p>
        {item.approvedBy.length > 0 && (
          <p>{t("maintainers.approvedBy", { names: item.approvedBy.map(nameOf).join(", ") })}</p>
        )}
        {item.missing.length > 0 && <p>{t("maintainers.notYetApprovedBy", { names: item.missing.map(nameOf).join(", ") })}</p>}
        {item.changesRequested.map(({ note, publisherId }) => (
          <p key={publisherId}>{t("maintainers.changesRequestedBy", { name: nameOf(publisherId), note })}</p>
        ))}
        {item.group === "approved" && item.courseId && (
          <Button nativeButton={false} render={<Link to={`/courses/${item.courseId}`} />} size="sm" variant="secondary">
            {t("maintainers.openCourse")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
