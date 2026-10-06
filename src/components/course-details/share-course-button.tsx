import { Share2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseCodeDialog } from "@/components/course-details/course-code-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCourseVersionHistoryQuery } from "@/lib/course-queries";
import { useCourseSharingQuery } from "@/lib/sharing-queries";

// Opens the course's code (or "publish first"), as a round icon button with a
// "Share course" tooltip. The teacher's own courses: in the editor's action
// bar and on the course page. An imported course: on its page, so a student
// can pass it on to classmates (`imported`).
export function ShareCourseButton({ courseId, imported = false }: { courseId: string; imported?: boolean }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // The version the code gives: your own course's published one; for an
  // imported course, the newest one you have (what you share with classmates).
  const { data: history } = useCourseVersionHistoryQuery(isOpen && !imported ? courseId : undefined);
  const { data: sharing } = useCourseSharingQuery(isOpen && imported ? courseId : undefined);
  const version = imported ? (sharing?.versions?.kept[0] ?? null) : (history?.publishedVersion ?? null);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={t("courseSharing.shareCourse")}
              data-testid="share-course"
              onClick={() => setIsOpen(true)}
              shape="circle"
              size="icon-sm"
              variant="secondary"
            />
          }
        >
          <Share2 aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{t("courseSharing.shareCourse")}</TooltipContent>
      </Tooltip>
      <CourseCodeDialog
        courseId={courseId}
        description={imported ? t("courseSharing.shareDescriptionImported") : t("courseSharing.shareDescription")}
        onClose={() => setIsOpen(false)}
        open={isOpen}
        title={t("courseSharing.shareCourse")}
        version={version}
      />
    </>
  );
}
