import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CourseSummary } from "@/lib/course-package";
import { useRemoveCourseMutation } from "@/lib/course-queries";

type RemoveCourseDialogProps = {
  course: CourseSummary | null;
  onOpenChange: (open: boolean) => void;
};

export function RemoveCourseDialog({
  course,
  onOpenChange,
}: RemoveCourseDialogProps) {
  const { t } = useTranslation();
  const removeCourseMutation = useRemoveCourseMutation();

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !removeCourseMutation.isPending) {
          onOpenChange(false);
        }
      }}
      open={Boolean(course)}
    >
      <DialogContent className="h-auto w-[min(32rem,calc(100vw-2rem))] rounded-3xl border border-stone-200 bg-white p-0 shadow-[0_24px_80px_-32px_rgba(41,37,36,0.35)]">
        <DialogHeader className="border-b-0 px-6 py-5">
          <div className="space-y-2">
            <DialogTitle>{t("courseSearch.removeDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("courseSearch.removeDialogDescription", {
                title: course?.title ?? "",
              })}
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="flex justify-end gap-3 px-6 pb-6 pt-0">
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
            variant="secondary"
          >
            {t("courseSearch.cancelRemove")}
          </Button>
          <Button
            onClick={() => {
              if (!course) {
                return;
              }

              void removeCourseMutation.mutateAsync(course.id).then(() => {
                onOpenChange(false);
              });
            }}
          >
            {removeCourseMutation.isPending
              ? t("courseSearch.removingCourse")
              : t("courseSearch.confirmRemove")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
