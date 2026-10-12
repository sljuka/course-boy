import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { quorumChoices, useStartSharingMutation } from "@/lib/maintainers-queries";
import { useRuleText } from "./use-rule-text";

// Starts maintaining the course together (SLJ-11): picks how many must
// approve each version (always more than half, said as a consequence, not a
// number), and proposes its current version as the shared course's first.
// Once everyone needed approves, the course moves to a new code and
// students follow it on their own.
export function StartSharingDialog({
  courseId,
  memberCount,
  onClose,
  open,
}: {
  courseId: string;
  memberCount: number;
  onClose: () => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const choices = quorumChoices(memberCount);
  // The smallest majority by default: still works if someone's away.
  const [quorum, setQuorum] = useState<number>(choices[0] ?? memberCount);
  const startMutation = useStartSharingMutation();

  const ruleText = useRuleText();
  const ruleLabel = (value: number) => ruleText(value, memberCount);
  const consequence =
    quorum === memberCount
      ? t("maintainers.ruleAllConsequence")
      : t("maintainers.ruleSomeConsequence", { count: memberCount - quorum });

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && !startMutation.isPending && onClose()} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" data-testid="start-sharing-dialog">
        <DialogHeader>
          <DialogTitle>{t("maintainers.startTitle")}</DialogTitle>
          <DialogDescription>{t("maintainers.startDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label>{t("maintainers.ruleLabel")}</Label>
          <Select onValueChange={(value) => setQuorum(Number(value))} value={String(quorum)}>
            <SelectTrigger className="w-full" data-testid="maintainers-rule">
              <SelectValue>{ruleLabel(quorum)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {choices.map((choice) => (
                <SelectItem key={choice} value={String(choice)}>
                  {ruleLabel(choice)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CardDescription>{consequence}</CardDescription>
        </div>
        <CardDescription>{t("maintainers.startMoveNote")}</CardDescription>
        {startMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>{startMutation.error.message}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button disabled={startMutation.isPending} onClick={onClose} variant="secondary">
            {t("maintainers.cancel")}
          </Button>
          <Button
            data-testid="start-sharing"
            disabled={startMutation.isPending}
            onClick={() => startMutation.mutate({ courseId, quorum }, { onSuccess: onClose })}
          >
            {startMutation.isPending && <Spinner aria-hidden="true" />}
            {t("maintainers.startButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
