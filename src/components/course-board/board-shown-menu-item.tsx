import { useTranslation } from "react-i18next";

import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { useCourseBoardQuery, useSetBoardShownMutation } from "@/lib/board-queries";

// "Show this course's board" in an imported course's ⋯ menu (SLJ-149): off,
// this device stops fetching the course's board and the tab goes away. Only
// for a course with a board (whether or not its teacher turned it on).
export function BoardShownMenuItem({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: board } = useCourseBoardQuery(courseId);
  const setShown = useSetBoardShownMutation(courseId);
  if (!board || board.status === "unavailable") return null;

  return (
    <DropdownMenuCheckboxItem
      checked={board.status !== "hidden"}
      data-testid="board-shown-toggle"
      onCheckedChange={(checked) => setShown.mutate(checked)}
    >
      {t("board.showThisBoard")}
    </DropdownMenuCheckboxItem>
  );
}
