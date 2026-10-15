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

// "Finish the test?" on a graded test (SLJ-135): asked when questions are
// left unanswered (they'd count as wrong; Keep going has the focus), and on
// Enter (SLJ-140; Finish has the focus, so a second Enter finishes). It says
// the answers can still be changed.
export function FinishGradedTestDialog({
  focusFinish,
  onConfirm,
  onOpenChange,
  open,
  unansweredCount,
}: {
  focusFinish: boolean;
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
            {unansweredCount > 0 && `${t("courseDetails.finishTestDialogDescription", { count: unansweredCount })} `}
            {t("courseDetails.finishTestCanGoBack")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button autoFocus={!focusFinish} onClick={() => onOpenChange(false)} variant="secondary">
            {t("courseDetails.keepGoing")}
          </Button>
          <Button autoFocus={focusFinish} data-testid="confirm-finish-test" onClick={onConfirm}>
            {t("courseDetails.finishTest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
