import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CourseBoard } from "@/lib/course-board";
import type { CourseView } from "@/lib/course-view";

// "Course | Board" at the start of a course's action bar (SLJ-149): on the
// teacher's editor and the student's course page, only while the board is
// on. The Board tab counts unread messages until it's opened.
export function CourseViewTabs({
  board,
  onViewChange,
  view,
}: {
  board: Extract<CourseBoard, { status: "on" }>;
  onViewChange: (view: CourseView) => void;
  view: CourseView;
}) {
  const { t } = useTranslation();
  return (
    <Tabs onValueChange={(value) => onViewChange(value as CourseView)} value={view}>
      <TabsList variant="pill">
        <TabsTrigger data-testid="course-tab-course" value="course" variant="pill">
          {t("board.tabs.course")}
        </TabsTrigger>
        <TabsTrigger data-testid="course-tab-board" value="board" variant="pill">
          {t("board.tabs.board")}
          {board.unread > 0 && view !== "board" && (
            <Badge data-testid="course-board-unread" shape="circle">
              {board.unread > 99 ? "99+" : board.unread}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
