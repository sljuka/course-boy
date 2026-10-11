import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CopyableCode } from "@/components/copyable-code";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useInviteMaintainerMutation } from "@/lib/maintainers-queries";

// Invites one person to maintain a course (SLJ-11, SLJ-67): their publisher
// id first (they copy it from Settings → Sharing), then a code for them alone.
// Only that publisher can use it (they prove it when joining), once, within a
// week.
export function InviteMaintainerDialog({
  courseId,
  onClose,
  open,
}: {
  courseId: string;
  onClose: () => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const [publisherId, setPublisherId] = useState("");
  const inviteMutation = useInviteMaintainerMutation();
  const code = inviteMutation.data?.code ?? null;

  function close() {
    if (inviteMutation.isPending) return;
    setPublisherId("");
    inviteMutation.reset();
    onClose();
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && close()} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" data-testid="invite-maintainer-dialog">
        <DialogHeader>
          <DialogTitle>{t("maintainers.inviteTitle")}</DialogTitle>
          <DialogDescription>
            {code ? t("maintainers.inviteDescription") : t("maintainers.invitePublisherDescription")}
          </DialogDescription>
        </DialogHeader>
        {code ? (
          <div className="flex flex-col gap-2">
            <CopyableCode label={t("maintainers.inviteCodeLabel")} testId="maintainer-invite-code" value={code} />
            <CardDescription>{t("maintainers.inviteWaiting")}</CardDescription>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maintainer-invitee">{t("maintainers.inviteePublisherId")}</Label>
            <Input
              autoFocus
              data-testid="maintainer-invitee"
              disabled={inviteMutation.isPending}
              id="maintainer-invitee"
              onChange={(event) => setPublisherId(event.target.value)}
              value={publisherId}
            />
          </div>
        )}
        {inviteMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>{inviteMutation.error.message}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          {code ? (
            <Button onClick={close} variant="secondary">
              {t("maintainers.done")}
            </Button>
          ) : (
            <Button
              data-testid="create-maintainer-invite"
              disabled={!publisherId.trim() || inviteMutation.isPending}
              onClick={() => inviteMutation.mutate({ courseId, publisherId: publisherId.trim() })}
            >
              {inviteMutation.isPending && <Spinner aria-hidden="true" />}
              {t("maintainers.createInvite")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
