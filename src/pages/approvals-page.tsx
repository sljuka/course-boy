import { CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Page } from "@/components/page/page";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { useCoursesQuery } from "@/lib/course-queries";
import { shortPublisherId, useApprovalsQuery } from "@/lib/maintainers-queries";
import { useAppState } from "@/lib/use-app-state";

// Versions other maintainers proposed for courses you maintain together
// (SLJ-11), waiting for your approval. Each opens its review.
export function ApprovalsPage() {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: approvals = [], isLoading } = useApprovalsQuery();
  const { data: courses = [] } = useCoursesQuery(locale);
  const titleOf = (item: { courseId: string | null; title: string | null }) =>
    courses.find((course) => course.id === item.courseId)?.title ?? item.title ?? t("maintainers.newCourse");

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
      {!isLoading && approvals.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <CardDescription>{t("maintainers.approvalsEmpty")}</CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col">
          {approvals.map((item) => (
            <ListRow data-testid="approval" key={item.hash}>
              <ListRowLink render={<Link to={`/approvals/${item.publicId}/${item.hash}`} />}>
                {titleOf(item)}
              </ListRowLink>
              <ListRowMeta>{t("maintainers.versionFrom", { name: shortPublisherId(item.from), version: item.version })}</ListRowMeta>
            </ListRow>
          ))}
        </div>
      )}
    </Page>
  );
}
