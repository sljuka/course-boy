import { Activity, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Page } from "@/components/page/page";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { useBoardUnreadQuery } from "@/lib/board-queries";
import { useCoursesQuery } from "@/lib/course-queries";
import { useAppState } from "@/lib/use-app-state";

// Activity (SLJ-149): what's new on the courses you teach and take. For now,
// boards with messages you haven't read, most first; each opens the course's
// board (yours in the editor, others' on the course page). (How many students imported, started and finished
// a course comes here later, SLJ-168.)
export function ActivityPage() {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: unread } = useBoardUnreadQuery();
  const { data: courses } = useCoursesQuery(locale);
  const isLoading = !unread || !courses;
  const titles = new Map((courses ?? []).map((course) => [course.id, course.title]));
  const ownCourses = new Set((courses ?? []).filter((course) => course.distribution === "local").map((course) => course.id));
  const rows = Object.entries(unread ?? {})
    .filter(([courseId]) => titles.has(courseId))
    .sort(([, a], [, b]) => b - a);

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
      {isLoading ? null : rows.length === 0 ? (
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
    </Page>
  );
}
