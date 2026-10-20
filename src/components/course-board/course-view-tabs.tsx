import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CourseBoard } from "@/lib/course-board";
import type { CourseView } from "@/lib/course-view";

// "Course | Board | Activity" at the start of a course's action bar: on the
// teacher's editor and the student's course page. Board only while the
// board is on (SLJ-149), counting unread messages until it's opened;
// Activity only on the teacher's editor, once the course is published
// (SLJ-168). No tabs when there's only the course.
export function CourseViewTabs({
  activity = false,
  board,
  onViewChange,
  view,
}: {
  activity?: boolean;
  board: Extract<CourseBoard, { status: "on" }> | null;
  onViewChange: (view: CourseView) => void;
  view: CourseView;
}) {
  const { t } = useTranslation();
  if (!board && !activity) return null;
  return (
    <Tabs onValueChange={(value) => onViewChange(value as CourseView)} value={view}>
      <TabsList variant="pill">
        <TabsTrigger data-testid="course-tab-course" value="course" variant="pill">
          {t("board.tabs.course")}
        </TabsTrigger>
        {board && (
          <TabsTrigger data-testid="course-tab-board" value="board" variant="pill">
            {t("board.tabs.board")}
            {board.unread > 0 && view !== "board" && (
              <Badge data-testid="course-board-unread" shape="circle">
                {board.unread > 99 ? "99+" : board.unread}
              </Badge>
            )}
          </TabsTrigger>
        )}
        {activity && (
          <TabsTrigger data-testid="course-tab-activity" value="activity" variant="pill">
            {t("board.tabs.activity")}
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}
