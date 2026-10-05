import { Share2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseCodeDialog } from "@/components/course-details/course-code-dialog";
import { Button, ButtonLabel } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Opens the course's code (or "publish first"). The teacher's own courses: in
// the editor's action bar ("Share") and on the course page. An imported
// course: on its page, so a student can pass it on to classmates (`imported`).
// `iconOnly`: an icon button with a "Share course" tooltip, next to Start.
export function ShareCourseButton({
  courseId,
  iconOnly = false,
  imported = false,
}: {
  courseId: string;
  iconOnly?: boolean;
  imported?: boolean;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {iconOnly ? (
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
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          title={t("courseSharing.shareButton")}
          variant="secondary"
        >
          <Share2 aria-hidden="true" />
          <ButtonLabel>{t("courseSharing.shareButton")}</ButtonLabel>
        </Button>
      )}
      <CourseCodeDialog
        courseId={courseId}
        description={imported ? t("courseSharing.shareDescriptionImported") : t("courseSharing.shareDescription")}
        onClose={() => setIsOpen(false)}
        open={isOpen}
        title={t("courseSharing.shareCourse")}
      />
    </>
  );
}
