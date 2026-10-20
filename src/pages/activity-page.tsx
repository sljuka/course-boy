import { Activity, BookOpen, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Page } from "@/components/page/page";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { Stat, StatGroup, StatLabel, StatValue } from "@/components/ui/stat";
import { useActivityListQuery } from "@/lib/activity-queries";
import { useBoardUnreadQuery } from "@/lib/board-queries";
import { useCoursesQuery } from "@/lib/course-queries";
import { useAppState } from "@/lib/use-app-state";

// Activity: what's new on the courses you teach and take.
// - Your courses' students (SLJ-168): totals across them, and each course
//   with about how many imported, started and finished it, opening its
//   Activity tab. First attempts; estimates.
// - Boards with messages you haven't read (SLJ-149), most first; each opens
//   the course's board (yours in the editor, others' on the course page).
export function ActivityPage() {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: unread } = useBoardUnreadQuery();
  const { data: summaries } = useActivityListQuery();
  const { data: courses } = useCoursesQuery(locale);
  const isLoading = !unread || !courses || !summaries;
  const titles = new Map((courses ?? []).map((course) => [course.id, course.title]));
  const ownCourses = new Set((courses ?? []).filter((course) => course.distribution === "local").map((course) => course.id));
  const rows = Object.entries(unread ?? {})
    .filter(([courseId]) => titles.has(courseId))
    .sort(([, a], [, b]) => b - a);
  const taught = Object.entries(summaries ?? {})
    .filter(([courseId]) => titles.has(courseId))
    .sort(([, a], [, b]) => b.imported - a.imported);
  const total = (pick: (summary: (typeof taught)[number][1]) => number) =>
    taught.reduce((sum, [, summary]) => sum + pick(summary), 0);
  const approx = (count: number) => t("courseActivity.approx", { value: count });

  return (
    <Page
      breadcrumbs={[{ icon: Activity, label: t("sidebar.activity") }]}
      header={
        <div className="flex flex-col gap-1">
          <CardTitle size="lg">{t("activity.title")}</CardTitle>
          <CardDescription>{t("activity.description")}</CardDescription>
        </div>
      }
    >
      {isLoading ? null : (
        <div className="flex flex-col gap-8">
          {taught.length > 0 && (
            <section className="flex flex-col gap-3" data-testid="activity-courses">
              <CardTitle>{t("activity.studentsTitle")}</CardTitle>
              <StatGroup>
                <Stat data-testid="activity-total-imported">
                  <StatLabel>{t("courseActivity.imported")}</StatLabel>
                  <StatValue>{approx(total((summary) => summary.imported))}</StatValue>
                </Stat>
                <Stat data-testid="activity-total-started">
                  <StatLabel>{t("courseActivity.started")}</StatLabel>
                  <StatValue>{approx(total((summary) => summary.started))}</StatValue>
                </Stat>
                <Stat data-testid="activity-total-finished">
                  <StatLabel>{t("courseActivity.finished")}</StatLabel>
                  <StatValue>{approx(total((summary) => summary.finished[0] ?? 0))}</StatValue>
                </Stat>
              </StatGroup>
              <div className="flex flex-col">
                {/* Column names, lined up with the rows' columns. */}
                <div className="flex h-8 items-center gap-3 px-2">
                  <span className="min-w-0 flex-1" />
                  <ListRowMeta align="end" className="w-20">
                    {t("courseActivity.imported")}
                  </ListRowMeta>
                  <ListRowMeta align="end" className="w-20">
                    {t("courseActivity.started")}
                  </ListRowMeta>
                  <ListRowMeta align="end" className="w-20">
                    {t("courseActivity.finished")}
                  </ListRowMeta>
                </div>
                {taught.map(([courseId, summary]) => (
                  <ListRow data-testid="activity-course-row" key={courseId}>
                    <BookOpen aria-hidden="true" className="size-4 shrink-0" />
                    <ListRowLink render={<Link state={{ courseView: "activity" }} to={`/drafts/${courseId}`} />}>
                      {titles.get(courseId)}
                    </ListRowLink>
                    <ListRowMeta align="end" className="w-20" emphasized>
                      {approx(summary.imported)}
                    </ListRowMeta>
                    <ListRowMeta align="end" className="w-20" emphasized>
                      {approx(summary.started)}
                    </ListRowMeta>
                    <ListRowMeta align="end" className="w-20" emphasized>
                      {approx(summary.finished[0] ?? 0)}
                    </ListRowMeta>
                  </ListRow>
                ))}
              </div>
              <CardDescription>{t("courseActivity.estimates")}</CardDescription>
            </section>
          )}

          <section className="flex flex-col gap-3">
            {taught.length > 0 && <CardTitle>{t("activity.messagesTitle")}</CardTitle>}
            {rows.length === 0 ? (
              <CardDescription data-testid="activity-empty">{t("activity.empty")}</CardDescription>
            ) : (
              <div className="flex flex-col">
                {rows.map(([courseId, count]) => (
                  <ListRow data-testid="activity-row" key={courseId}>
                    <MessageSquare aria-hidden="true" className="size-4 shrink-0" />
                    {/* Your own course's board is in its editor; another's on its page. */}
                    <ListRowLink
                      render={
                        <Link
                          state={{ courseView: "board" }}
                          to={ownCourses.has(courseId) ? `/drafts/${courseId}` : `/courses/${courseId}`}
                        />
                      }
                    >
                      {titles.get(courseId)}
                    </ListRowLink>
                    <ListRowMeta emphasized>{t("activity.unreadMessages", { count })}</ListRowMeta>
                  </ListRow>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}
