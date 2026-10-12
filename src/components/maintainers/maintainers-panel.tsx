import { UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ChangeMaintainersDialog } from "@/components/maintainers/change-maintainers-dialog";
import { InviteMaintainerDialog } from "@/components/maintainers/invite-maintainer-dialog";
import { StartSharingDialog } from "@/components/maintainers/start-sharing-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { ListRow, ListRowMeta } from "@/components/ui/list-row";
import { PanelCard } from "@/components/ui/panel-card";
import { useCourseVersionHistoryQuery } from "@/lib/course-queries";
import {
  shortPublisherId,
  useMaintainersQuery,
  useOwnPublisherIdQuery,
} from "@/lib/maintainers-queries";
import { useRuleText } from "./use-rule-text";

// The course editor's Maintainers panel (SLJ-11): who maintains the course
// with you, and how many must approve each version.
// - Not published yet: nothing to share, so it says so.
// - Yours, before sharing: invite maintainers (one code each), then start
//   maintaining it together, with the rule.
// - Shared: the maintainers, the rule, your version waiting for approval and
//   any notes asking for changes. Publish then asks for approval. The owner
//   can invite more people (they show as joined) and change the maintainers
//   or the rule (SLJ-70): another move, approved like a version.
// - Removed by such a change: says so; the course stays here, yours.
export function MaintainersPanel({ courseId, variant }: { courseId: string; variant?: "card" | "section" }) {
  const { t } = useTranslation();
  const { data: info } = useMaintainersQuery(courseId);
  const { data: history } = useCourseVersionHistoryQuery(courseId);
  const { data: ownId } = useOwnPublisherIdQuery();
  const [isInviting, setIsInviting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const ruleText = useRuleText();

  const isPublished = Boolean(history?.publishedVersion);
  const members = info?.members ?? [];
  const isOwner = !info || info.role === "owner";
  const isRemoved = Boolean(info?.removed);
  const isShared = Boolean(info?.sharedKey) && !isRemoved;
  // After sharing, an invite lets a maintainer back in (on a new computer),
  // or someone new join, to be added by a change (SLJ-70).
  const canInvite = isOwner && isPublished && !isRemoved;
  const inviteLabel = isShared ? t("maintainers.inviteShared") : t("maintainers.invite");
  const pending = info?.pending ?? [];
  const nameOf = (publisherId: string) => (publisherId === ownId ? t("maintainers.you") : shortPublisherId(publisherId));

  return (
    <PanelCard
      action={
        canInvite && (
          <Button
            aria-label={inviteLabel}
            data-testid="invite-maintainer"
            onClick={() => setIsInviting(true)}
            size="icon-xs"
            title={inviteLabel}
            variant="ghost"
          >
            <UserPlus aria-hidden="true" />
          </Button>
        )
      }
      title={t("maintainers.panelTitle")}
      variant={variant}
    >
      <div className="flex flex-col gap-2 px-1.5 py-1" data-testid="maintainers-panel">
        {!isPublished && !info && <CardDescription>{t("maintainers.publishFirst")}</CardDescription>}
        {isPublished && members.length <= 1 && !isShared && (
          <CardDescription>{t("maintainers.intro")}</CardDescription>
        )}
        {isRemoved && (
          <Alert data-testid="maintainers-removed">
            <AlertDescription>{t("maintainers.removedNotice")}</AlertDescription>
          </Alert>
        )}
        {members.length > 1 && !isRemoved && (
          <div className="flex flex-col">
            {members.map((member) => (
              <ListRow className="h-8 gap-2" data-testid="maintainer" key={member.publisherId}>
                <Users aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{nameOf(member.publisherId)}</span>
              </ListRow>
            ))}
            {isShared &&
              pending.map((member) => (
                <ListRow className="h-8 gap-2" data-testid="maintainer-pending" key={member.publisherId}>
                  <UserPlus aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{nameOf(member.publisherId)}</span>
                  <ListRowMeta>{t("maintainers.joinedPending")}</ListRowMeta>
                </ListRow>
              ))}
          </div>
        )}
        {isShared && info && (
          <ListRowMeta data-testid="maintainers-rule-text">{ruleText(info.quorum, members.length)}</ListRowMeta>
        )}
        {info?.proposal && !isRemoved && (
          <Badge data-testid="maintainers-waiting" variant="warning">
            {info.proposal.change
              ? t("maintainers.changeWaiting")
              : t("maintainers.waitingForApproval", { version: info.proposal.version })}
          </Badge>
        )}
        {info &&
          Object.entries(info.changesRequested).map(([publisherId, note]) => (
            <Alert data-testid="maintainers-changes-requested" key={publisherId}>
              <AlertDescription>
                {t("maintainers.changesRequestedBy", { name: shortPublisherId(publisherId), note })}
              </AlertDescription>
            </Alert>
          ))}
        {isOwner && !isShared && !isRemoved && members.length > 1 && (
          <Button data-testid="open-start-sharing" onClick={() => setIsStarting(true)} size="sm">
            {t("maintainers.startOpen")}
          </Button>
        )}
        {isOwner && isShared && !info?.proposal && (
          <Button data-testid="open-change-maintainers" onClick={() => setIsChanging(true)} size="sm" variant="secondary">
            {t("maintainers.changeOpen")}
          </Button>
        )}
      </div>
      <InviteMaintainerDialog
        courseId={courseId}
        isShared={isShared}
        onClose={() => setIsInviting(false)}
        open={isInviting}
      />
      {info && isChanging && (
        <ChangeMaintainersDialog
          courseId={courseId}
          info={info}
          onClose={() => setIsChanging(false)}
          open={isChanging}
          ownId={ownId ?? ""}
        />
      )}
      <StartSharingDialog
        courseId={courseId}
        // Remounted when someone joins, so the rule's choices follow.
        key={members.length}
        memberCount={members.length}
        onClose={() => setIsStarting(false)}
        open={isStarting}
      />
    </PanelCard>
  );
}
