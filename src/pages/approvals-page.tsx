import { CheckCheck } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ApprovalRow } from "@/components/approvals/approval-row";
import { Page } from "@/components/page/page";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ListGroup, ListGroupContent, ListGroupHeader } from "@/components/ui/list-group";
import { StatusIcon } from "@/components/ui/status-icon";
import { useCoursesQuery } from "@/lib/course-queries";
import { APPROVAL_GROUPS, type ApprovalGroup, type ApprovalItem } from "@/lib/maintainers";
import { useApprovalsQuery, useOwnPublisherIdQuery } from "@/lib/maintainers-queries";
import { useAppState } from "@/lib/use-app-state";

// Each group's header glyph.
const GROUP_ICONS = {
  approved: "done",
  "changes-requested": "attention",
  replaced: "canceled",
  "waiting-for-others": "pending",
  "waiting-for-you": "changed",
} as const satisfies Record<ApprovalGroup, string>;

// Versions proposed for the courses you maintain together (SLJ-11, SLJ-109),
// grouped Linear-style: Waiting for you, Waiting for others (yours, or ones
// you approved, until enough of you have), Changes requested, Approved (went
// online), and Replaced (a newer one took its place; folded). Waiting ones
// newest first by when they arrived, decided ones by when that happened.
// Each row opens the version's page.
export function ApprovalsPage() {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data, isLoading } = useApprovalsQuery();
  const { data: ownPublisherId = "" } = useOwnPublisherIdQuery();
  const { data: courses = [] } = useCoursesQuery(locale);
  const titleOf = (item: ApprovalItem) =>
    courses.find((course) => course.id === item.courseId)?.title ?? item.title ?? t("maintainers.newCourse");

  const groups = useMemo(() => {
    const byGroup = Object.fromEntries(APPROVAL_GROUPS.map((group) => [group, [] as ApprovalItem[]])) as Record<
      ApprovalGroup,
      ApprovalItem[]
    >;
    for (const item of data?.items ?? []) byGroup[item.group].push(item);
    for (const items of Object.values(byGroup)) {
      items.sort((left, right) => (right.decidedAt ?? right.proposedAt) - (left.decidedAt ?? left.proposedAt));
    }
    return byGroup;
  }, [data]);

  return (
    <Page
      breadcrumbs={[{ icon: CheckCheck, label: t("sidebar.approvals") }]}
      header={
        <div className="flex flex-col gap-1">
          <CardTitle size="lg">{t("maintainers.approvalsTitle")}</CardTitle>
          <CardDescription className="max-w-3xl">{t("maintainers.approvalsDescription")}</CardDescription>
        </div>
      }
    >
      {!isLoading && (data?.items.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-10">
            <CardDescription>{t("maintainers.approvalsEmpty")}</CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {APPROVAL_GROUPS.map(
            (group) =>
              groups[group].length > 0 && (
                <ListGroup data-testid={`approvals-group-${group}`} defaultOpen={group !== "replaced"} key={group}>
                  <ListGroupHeader
                    count={groups[group].length}
                    icon={<StatusIcon progress={group === "waiting-for-others" ? 0.5 : undefined} status={GROUP_ICONS[group]} />}
                    title={t(`maintainers.groups.${group}`)}
                  />
                  <ListGroupContent>
                    {groups[group].map((item) => (
                      <ApprovalRow item={item} key={item.hash} ownPublisherId={ownPublisherId} title={titleOf(item)} />
                    ))}
                  </ListGroupContent>
                </ListGroup>
              ),
          )}
        </div>
      )}
    </Page>
  );
}
