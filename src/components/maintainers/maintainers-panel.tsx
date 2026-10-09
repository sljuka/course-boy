import { UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  useInviteMaintainerMutation,
  useMaintainersQuery,
  useOwnPublisherIdQuery,
} from "@/lib/maintainers-queries";

// The course editor's Maintainers panel (SLJ-11): who maintains the course
// with you, and how many must approve each version.
// - Not published yet: nothing to share, so it says so.
// - Yours, before sharing: invite maintainers (one code each), then start
//   maintaining it together, with the rule.
// - Shared: the maintainers, the rule, your version waiting for approval and
//   any notes asking for changes. Publish then asks for approval.
export function MaintainersPanel({ courseId, variant }: { courseId: string; variant?: "card" | "section" }) {
  const { t } = useTranslation();
  const { data: info } = useMaintainersQuery(courseId);
  const { data: history } = useCourseVersionHistoryQuery(courseId);
  const { data: ownId } = useOwnPublisherIdQuery();
  const inviteMutation = useInviteMaintainerMutation();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const isPublished = Boolean(history?.publishedVersion);
  const members = info?.members ?? [];
  const isOwner = !info || info.role === "owner";
  const isShared = Boolean(info?.sharedKey);
  const canInvite = isOwner && isPublished && !isShared;

  const ruleText = (quorum: number, count: number) =>
    quorum === count
      ? count === 2
        ? t("maintainers.ruleBoth")
        : t("maintainers.ruleAll", { count })
      : t("maintainers.ruleSome", { count, quorum });

  return (
    <PanelCard
      action={
        canInvite && (
          <Button
            aria-label={t("maintainers.invite")}
            data-testid="invite-maintainer"
            disabled={inviteMutation.isPending}
            onClick={() => inviteMutation.mutate(courseId, { onSuccess: ({ code }) => setInviteCode(code) })}
            size="icon-xs"
            title={t("maintainers.invite")}
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
        {members.length > 1 && (
          <div className="flex flex-col">
            {members.map((member) => (
              <ListRow className="h-8 gap-2" data-testid="maintainer" key={member.publisherId}>
                <Users aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {member.publisherId === ownId ? t("maintainers.you") : shortPublisherId(member.publisherId)}
                </span>
              </ListRow>
            ))}
          </div>
        )}
        {isShared && info && (
          <ListRowMeta data-testid="maintainers-rule-text">{ruleText(info.quorum, members.length)}</ListRowMeta>
        )}
        {info?.proposal && (
          <Badge data-testid="maintainers-waiting" variant="warning">
            {t("maintainers.waitingForApproval", { version: info.proposal.version })}
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
        {isOwner && !isShared && members.length > 1 && (
          <Button data-testid="open-start-sharing" onClick={() => setIsStarting(true)} size="sm">
            {t("maintainers.startOpen")}
          </Button>
        )}
        {inviteMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>{inviteMutation.error.message}</AlertDescription>
          </Alert>
        )}
      </div>
      <InviteMaintainerDialog code={inviteCode} onClose={() => setInviteCode(null)} />
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
