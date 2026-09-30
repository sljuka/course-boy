import { MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { RemoveCourseDialog } from "@/components/course-search/remove-course-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// A course's own menu (⋯), at the end of the page's action bar: after Commit
// new version in the editor's course page, after Share on the course details
// page. Remove course asks first, then leaves for `afterRemovePath` (the
// course is gone).
export function CourseActionsMenu({
  afterRemovePath,
  course,
}: {
  afterRemovePath: string;
  course: { id: string; title: string };
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={t("courseSearch.courseMenuLabel", { title: course.title })}
              shape="circle"
              size="icon-sm"
              title={t("courseSearch.courseMenuLabel", { title: course.title })}
              variant="subtle"
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44">
          <DropdownMenuItem onClick={() => setIsRemoveOpen(true)} variant="destructive">
            <Trash2 aria-hidden="true" />
            {t("courseSearch.removeCourse")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RemoveCourseDialog
        course={isRemoveOpen ? course : null}
        onOpenChange={setIsRemoveOpen}
        onRemoved={() => navigate(afterRemovePath, { replace: true })}
      />
    </>
  );
}
