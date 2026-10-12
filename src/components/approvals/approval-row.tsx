import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { StatusIcon } from "@/components/ui/status-icon";
import { formatShortDate } from "@/lib/format-date";
import type { ApprovalItem } from "@/lib/maintainers";
import { usePublisherName } from "@/lib/publishers-queries";
import { useAppState } from "@/lib/use-app-state";

// One proposed version in Approvals (SLJ-109): its group's glyph (a pie of
// how many approved while it waits), the course, the version and who
// proposed it, then what it waits for or what happened, and a date. The
// whole row opens it.
export function ApprovalRow({ item, ownPublisherId, title }: { item: ApprovalItem; ownPublisherId: string; title: string }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const publisherName = usePublisherName();
  const nameOf = (publisherId: string) => (publisherId === ownPublisherId ? t("maintainers.you") : publisherName(publisherId));
  const approved = Math.min(item.approvedBy.length, item.quorum);
  const date = item.decidedAt ?? item.proposedAt;

  return (
    <ListRow data-group={item.group} data-testid="approval">
      {item.group === "waiting-for-you" ? (
        <StatusIcon status="changed" />
      ) : item.group === "waiting-for-others" ? (
        <StatusIcon progress={approved / item.quorum} status="pending" />
      ) : item.group === "changes-requested" ? (
        <StatusIcon status="attention" />
      ) : item.group === "approved" ? (
        <StatusIcon status="done" />
      ) : (
        <StatusIcon status="canceled" />
      )}
      <ListRowLink render={<Link to={`/approvals/${item.publicId}/${item.hash}`} />}>{title}</ListRowLink>
      <ListRowMeta>
        {item.change
          ? t("maintainers.changeRow")
          : item.mine
            ? t("maintainers.versionYours", { version: item.version })
            : t("maintainers.versionFrom", { name: nameOf(item.from), version: item.version })}
      </ListRowMeta>
      <ListRowMeta align="end" className="w-64" data-testid="approval-status" fill>
        {item.group === "changes-requested"
          ? t("maintainers.changesAskedBy", { names: item.changesRequested.map(({ publisherId }) => nameOf(publisherId)).join(", ") })
          : item.group === "waiting-for-others"
            ? t("maintainers.approvedCountWaiting", {
                approved,
                names: item.missing.map(nameOf).join(", "),
                quorum: item.quorum,
              })
            : item.group === "waiting-for-you"
              ? t("maintainers.approvedCount", { approved, quorum: item.quorum })
              : null}
      </ListRowMeta>
      {item.change && (item.group === "waiting-for-others" || item.group === "waiting-for-you") && (
        <ListRowMeta data-testid="approval-change-status">
          {t("maintainers.changeNewApproved", { approved: item.change.approvedBy.length, quorum: item.change.quorum })}
        </ListRowMeta>
      )}
      <ListRowMeta align="end" className="w-16">
        {formatShortDate(new Date(date).toISOString(), locale)}
      </ListRowMeta>
    </ListRow>
  );
}
