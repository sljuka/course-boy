import { useTranslation } from "react-i18next";

import { useRuleText } from "@/components/maintainers/use-rule-text";
import { CardDescription, CardTitle } from "@/components/ui/card";
import type { ApprovalItem } from "@/lib/maintainers";
import { usePublisherName } from "@/lib/publishers-queries";

// What a change of maintainers does (SLJ-70), on its page: who it adds and
// removes, the rule before and after, and how far the new maintainers are
// with approving it. The course itself doesn't change; it gets a new code.
export function ChangeSummary({ item, ownPublisherId }: { item: ApprovalItem; ownPublisherId: string }) {
  const { t } = useTranslation();
  const ruleText = useRuleText();
  const change = item.change!;
  const publisherName = usePublisherName();
  const nameOf = (publisherId: string) => (publisherId === ownPublisherId ? t("maintainers.you") : publisherName(publisherId));
  const names = (ids: string[]) => ids.map(nameOf).join(", ");

  return (
    <div className="flex flex-col gap-2" data-testid="change-summary">
      <CardTitle>{t("maintainers.changeRow")}</CardTitle>
      {change.added.length > 0 && <CardDescription>{t("maintainers.changeAdds", { names: names(change.added) })}</CardDescription>}
      {change.removed.length > 0 && (
        <CardDescription>{t("maintainers.changeRemoves", { names: names(change.removed) })}</CardDescription>
      )}
      <CardDescription>
        {t("maintainers.changeRule", {
          after: ruleText(change.quorum, change.count),
          before: ruleText(change.previousQuorum, change.previousCount),
        })}
      </CardDescription>
      {item.group !== "approved" && item.group !== "replaced" && (
        <CardDescription>
          {t("maintainers.changeNewApproved", { approved: change.approvedBy.length, quorum: change.quorum })}
        </CardDescription>
      )}
      <CardDescription>{t("maintainers.changeMoveNote")}</CardDescription>
    </div>
  );
}
