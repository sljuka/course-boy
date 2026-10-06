import { useTranslation } from "react-i18next";

import { CourseCode } from "@/components/course-details/course-code";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Shows a course's code: after Publish ("Published 0.0.2") and from the course
// page ("Share"), which also says which version the code gives (`version`).
export function CourseCodeDialog({
  courseId,
  description,
  onClose,
  open,
  title,
  version,
}: {
  courseId: string;
  description: string;
  onClose: () => void;
  open: boolean;
  title: string;
  version?: string | null;
}) {
  const { t } = useTranslation();

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {version && (
          <CardDescription data-testid="shared-version">{t("courseSharing.sharedVersion", { version })}</CardDescription>
        )}
        <CourseCode courseId={courseId} />
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">
            {t("courseSharing.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
