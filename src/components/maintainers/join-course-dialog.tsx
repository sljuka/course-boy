import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { useAcceptMaintainerInviteMutation } from "@/lib/maintainers-queries";

// Joins someone's course as a maintainer with the code they sent (SLJ-11).
// The course arrives in My courses once its owner starts maintaining it
// together and the first shared version is approved.
export function JoinCourseDialog({ onOpenChange, open }: { onOpenChange: (open: boolean) => void; open: boolean }) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const acceptMutation = useAcceptMaintainerInviteMutation();

  function close() {
    if (acceptMutation.isPending) return;
    setCode("");
    setHasJoined(false);
    acceptMutation.reset();
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" data-testid="join-course-dialog">
        <DialogHeader>
          <DialogTitle>{t("maintainers.joinTitle")}</DialogTitle>
          <DialogDescription>{hasJoined ? t("maintainers.joined") : t("maintainers.joinDescription")}</DialogDescription>
        </DialogHeader>
        {!hasJoined && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maintainer-join-code">{t("maintainers.inviteCodeLabel")}</Label>
            <Input
              autoFocus
              data-testid="maintainer-join-code"
              disabled={acceptMutation.isPending}
              id="maintainer-join-code"
              onChange={(event) => setCode(event.target.value)}
              value={code}
            />
          </div>
        )}
        {acceptMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>{acceptMutation.error.message}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          {hasJoined ? (
            <Button onClick={close}>{t("maintainers.done")}</Button>
          ) : (
            <Button
              data-testid="maintainer-join"
              disabled={!code.trim() || acceptMutation.isPending}
              onClick={() => acceptMutation.mutate(code.trim(), { onSuccess: () => setHasJoined(true) })}
            >
              {acceptMutation.isPending && <Spinner aria-hidden="true" />}
              {t("maintainers.join")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
