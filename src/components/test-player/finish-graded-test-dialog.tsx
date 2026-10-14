import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// "Finish test" on a graded test (SLJ-135) with questions left unanswered:
// they'd count as wrong, so it asks first. Keep going is the default.
export function FinishGradedTestDialog({
  onConfirm,
  onOpenChange,
  open,
  unansweredCount,
}: {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  unansweredCount: number;
}) {
  const { t } = useTranslation();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))]" data-testid="finish-graded-test-dialog">
        <DialogHeader>
          <DialogTitle>{t("courseDetails.finishTestDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("courseDetails.finishTestDialogDescription", { count: unansweredCount })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button autoFocus onClick={() => onOpenChange(false)} variant="secondary">
            {t("courseDetails.keepGoing")}
          </Button>
          <Button onClick={onConfirm}>{t("courseDetails.finishTest")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
