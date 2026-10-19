import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import { useClearCourseProgressMutation } from "@/lib/course-progress-queries";

// "Retake course" on a finished course (SLJ-171): the two ways to go through
// it again, each said in the dialog (not in tooltips, since one of them
// deletes progress for good):
// - Review: from the start, progress and test scores kept (not a new
//   attempt);
// - Start over: progress and test scores cleared (the star kept), a fresh
//   attempt.
// Either way the course opens at its first step (`onOpen`).
export function RetakeCourseDialog({
  course,
  onOpen,
  onOpenChange,
}: {
  course: { id: string; title: string } | null;
  onOpen: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const clearProgress = useClearCourseProgressMutation();

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !clearProgress.isPending) onOpenChange(false);
      }}
      open={Boolean(course)}
    >
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))] sm:max-w-[32rem]" data-testid="retake-course-dialog">
        <DialogHeader>
          <DialogTitle>{t("courseEntry.retakeTitle", { title: course?.title ?? "" })}</DialogTitle>
        </DialogHeader>
        <PropertyList className="gap-y-3 px-0">
          <PropertyRow label={t("courseEntry.review")}>{t("courseEntry.reviewDescription")}</PropertyRow>
          <PropertyRow label={t("courseEntry.startOver")}>{t("courseEntry.startOverDescription")}</PropertyRow>
        </PropertyList>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            {t("courseSearch.cancelRemove")}
          </Button>
          <Button
            data-testid="retake-review"
            disabled={clearProgress.isPending}
            onClick={() => {
              onOpenChange(false);
              onOpen();
            }}
            variant="secondary"
          >
            {t("courseEntry.review")}
          </Button>
          <Button
            data-testid="retake-start-over"
            disabled={clearProgress.isPending}
            onClick={() => {
              if (!course) return;
              clearProgress.mutate(course.id, {
                onSuccess: () => {
                  onOpenChange(false);
                  onOpen();
                },
              });
            }}
          >
            {t("courseEntry.startOver")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
