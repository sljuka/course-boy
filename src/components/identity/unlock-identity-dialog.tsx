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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useUnlockIdentityMutation } from "@/lib/publisher-identity-queries";

// Asks for the identity's password (SLJ-55) when a Publish needs the identity
// and it's still locked this session ("Open without publishing").
export function UnlockIdentityDialog({
  onClose,
  onUnlocked,
  open,
}: {
  onClose: () => void;
  onUnlocked: () => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const unlockMutation = useUnlockIdentityMutation();
  const isWrong = unlockMutation.data !== undefined && "error" in unlockMutation.data;

  function close() {
    if (unlockMutation.isPending) return;
    setPassword("");
    unlockMutation.reset();
    onClose();
  }

  function unlock() {
    unlockMutation.mutate(
      { password },
      {
        onSuccess: (result) => {
          if (!("unlocked" in result)) return;
          setPassword("");
          unlockMutation.reset();
          onUnlocked();
        },
      },
    );
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && close()} open={open}>
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))]" data-testid="unlock-identity-dialog">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (password && !unlockMutation.isPending) unlock();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("publisherIdentity.unlockTitle")}</DialogTitle>
            <DialogDescription>{t("publisherIdentity.unlockDescription")}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="unlock-identity-password">{t("publisherIdentity.password")}</FieldLabel>
            <Input
              aria-invalid={isWrong}
              autoComplete="current-password"
              autoFocus
              id="unlock-identity-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </Field>
          {isWrong && (
            <Alert variant="destructive">
              <AlertDescription>{t("publisherIdentity.wrongPassword")}</AlertDescription>
            </Alert>
          )}
          {unlockMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>{unlockMutation.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button disabled={unlockMutation.isPending} onClick={close} type="button" variant="secondary">
              {t("publisherIdentity.cancel")}
            </Button>
            <Button data-testid="unlock-identity" disabled={!password || unlockMutation.isPending} type="submit">
              {unlockMutation.isPending && <Spinner aria-hidden="true" />}
              {t("publisherIdentity.unlock")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
