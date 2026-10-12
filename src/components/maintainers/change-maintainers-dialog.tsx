import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { MaintainersInfo } from "@/lib/maintainers";
import { quorumChoices, useProposeChangeMutation } from "@/lib/maintainers-queries";
import { usePublisherName } from "@/lib/publishers-queries";
import { useRuleText } from "./use-rule-text";

// Changes who maintains a shared course, or the rule (SLJ-70): pick the
// maintainers (the current ones, and anyone who joined with an invite since;
// you stay), and how many must approve. It's another move: once the current
// maintainers approve under the current rule, and the new ones under the new
// rule, the course gets a new code and students follow it on their own.
export function ChangeMaintainersDialog({
  courseId,
  info,
  onClose,
  open,
  ownId,
}: {
  courseId: string;
  info: MaintainersInfo;
  onClose: () => void;
  open: boolean;
  ownId: string;
}) {
  const { t } = useTranslation();
  const ruleText = useRuleText();
  const owner = info.members[0]?.publisherId ?? ownId;
  const candidates = [
    ...info.members.map((member) => ({ isPending: false, publisherId: member.publisherId })),
    ...info.pending.map((member) => ({ isPending: true, publisherId: member.publisherId })),
  ];
  // Everyone ticked by default: inviting someone is usually to add them.
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(candidates.map((candidate) => candidate.publisherId)));
  const count = chosen.size;
  const choices = quorumChoices(count);
  const [rule, setRule] = useState<number | null>(null);
  // The rule follows the count until one is picked (the smallest majority).
  const quorum = rule !== null && choices.includes(rule) ? rule : (choices[0] ?? count);
  const changeMutation = useProposeChangeMutation();

  const removed = info.members.filter((member) => !chosen.has(member.publisherId));
  // Under "everyone approves", removing someone needs their approval too.
  const removalNeedsThem = removed.length > 0 && info.quorum === info.members.length;
  const publisherName = usePublisherName();
  const nameOf = (publisherId: string) => (publisherId === ownId ? t("maintainers.you") : publisherName(publisherId));

  function toggle(publisherId: string, checked: boolean) {
    setChosen((current) => {
      const next = new Set(current);
      if (checked) next.add(publisherId);
      else next.delete(publisherId);
      return next;
    });
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && !changeMutation.isPending && onClose()} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" data-testid="change-maintainers-dialog">
        <DialogHeader>
          <DialogTitle>{t("maintainers.changeTitle")}</DialogTitle>
          <DialogDescription>{t("maintainers.changeDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {candidates.map((candidate) => (
            <Field key={candidate.publisherId} orientation="horizontal">
              <Checkbox
                checked={chosen.has(candidate.publisherId)}
                data-testid="change-maintainer"
                disabled={candidate.publisherId === owner || changeMutation.isPending}
                id={`change-maintainer-${candidate.publisherId}`}
                onCheckedChange={(checked) => toggle(candidate.publisherId, checked === true)}
                value={candidate.publisherId}
              />
              <FieldContent>
                <FieldLabel htmlFor={`change-maintainer-${candidate.publisherId}`}>{nameOf(candidate.publisherId)}</FieldLabel>
                {candidate.isPending && <FieldDescription>{t("maintainers.joinedPending")}</FieldDescription>}
              </FieldContent>
            </Field>
          ))}
        </div>
        {count >= 2 ? (
          <div className="flex flex-col gap-1.5">
            <Label>{t("maintainers.ruleLabel")}</Label>
            <Select onValueChange={(value) => setRule(Number(value))} value={String(quorum)}>
              <SelectTrigger className="w-full" data-testid="change-maintainers-rule">
                <SelectValue>{ruleText(quorum, count)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {choices.map((choice) => (
                  <SelectItem key={choice} value={String(choice)}>
                    {ruleText(choice, count)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CardDescription>
              {quorum === count
                ? t("maintainers.ruleAllConsequence")
                : t("maintainers.ruleSomeConsequence", { count: count - quorum })}
            </CardDescription>
          </div>
        ) : (
          <CardDescription>{t("maintainers.changeNeedsTwo")}</CardDescription>
        )}
        <CardDescription>
          {t("maintainers.changeApprovalNote", { rule: ruleText(info.quorum, info.members.length) })}
        </CardDescription>
        {removalNeedsThem && (
          <Alert data-testid="change-needs-removed">
            <AlertDescription>
              {t("maintainers.changeNeedsRemoved", { names: removed.map((member) => nameOf(member.publisherId)).join(", ") })}
            </AlertDescription>
          </Alert>
        )}
        {changeMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>{changeMutation.error.message}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button disabled={changeMutation.isPending} onClick={onClose} variant="secondary">
            {t("maintainers.cancel")}
          </Button>
          <Button
            data-testid="propose-change"
            disabled={changeMutation.isPending || count < 2}
            onClick={() =>
              changeMutation.mutate(
                { courseId, publisherIds: [...chosen].filter((id) => id !== owner), quorum },
                { onSuccess: onClose },
              )
            }
          >
            {changeMutation.isPending && <Spinner aria-hidden="true" />}
            {t("maintainers.startButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
