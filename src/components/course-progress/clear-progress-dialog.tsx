import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClearCourseProgressMutation } from "@/lib/course-progress-queries";

// Asks before clearing a course's progress (lessons done, test scores, when
// it was started): it can't be undone. The star stays.
export function ClearProgressDialog({
  course,
  onOpenChange,
}: {
  course: { id: string; title: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const clearProgress = useClearCourseProgressMutation();

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !clearProgress.isPending) {
          onOpenChange(false);
        }
      }}
      open={Boolean(course)}
    >
      <DialogContent className="w-[min(30rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{t("courseSearch.clearProgressDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("courseSearch.clearProgressDialogDescription", { title: course?.title ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            {t("courseSearch.cancelRemove")}
          </Button>
          <Button
            data-testid="confirm-clear-progress"
            disabled={clearProgress.isPending}
            onClick={() => {
              if (!course) {
                return;
              }

              clearProgress.mutate(course.id, { onSuccess: () => onOpenChange(false) });
            }}
          >
            {clearProgress.isPending ? t("courseSearch.clearingProgress") : t("courseSearch.confirmClearProgress")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
