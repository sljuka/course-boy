import { Share2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseCodeDialog } from "@/components/course-details/course-code-dialog";
import { Button, ButtonLabel } from "@/components/ui/button";

// Opens the course's code (or "publish first"), for the teacher's own courses:
// in the editor's action bar and on the course page.
export function ShareCourseButton({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        title={t("courseSharing.shareButton")}
        variant="secondary"
      >
        <Share2 aria-hidden="true" />
        <ButtonLabel>{t("courseSharing.shareButton")}</ButtonLabel>
      </Button>
      <CourseCodeDialog
        courseId={courseId}
        description={t("courseSharing.shareDescription")}
        onClose={() => setIsOpen(false)}
        open={isOpen}
        title={t("courseSharing.shareButton")}
      />
    </>
  );
}
