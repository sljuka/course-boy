import { TriangleAlert } from "lucide-react";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MIN_IDENTITY_PASSWORD_LENGTH } from "@/lib/publisher-identity";
import { useSetUpIdentityMutation } from "@/lib/publisher-identity-queries";

const INTRO_PARTS = ["online", "signing", "file"] as const;

// Sets up the publishing identity (SLJ-55), in two steps: first what going
// online, signing and the identity file are (nothing to fill in), then a
// password, typed twice. It creates the identity and its file, locked with
// that password; the file is also the backup. Opened by the first Publish
// (`beforePublish`: it then publishes) or from Settings → Publishing. A lost
// password can't be recovered, which the password step says plainly.
export function SetUpIdentityDialog({
  beforePublish = false,
  onClose,
  onDone,
  open,
}: {
  beforePublish?: boolean;
  onClose: () => void;
  onDone?: () => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [step, setStep] = useState<"intro" | "password">("intro");
  const setUpMutation = useSetUpIdentityMutation();
  const isTooShort = [...password].length < MIN_IDENTITY_PASSWORD_LENGTH;
  const isMismatch = confirmation.length > 0 && confirmation !== password;
  const canSetUp = !isTooShort && confirmation === password && !setUpMutation.isPending;

  function close() {
    if (setUpMutation.isPending) return;
    setPassword("");
    setConfirmation("");
    setStep("intro");
    setUpMutation.reset();
    onClose();
  }

  function setUp() {
    setUpMutation.mutate(
      { password },
      {
        onSuccess: (result) => {
          if (!("ok" in result)) return;
          close();
          onDone?.();
        },
      },
    );
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && close()} open={open}>
      <DialogContent className="w-[min(30rem,calc(100vw-2rem))]" data-testid="set-up-identity-dialog">
        {step === "intro" ? (
          <>
            <DialogHeader>
              <CardDescription>{t("publisherIdentity.stepOf", { step: 1, total: 2 })}</CardDescription>
              <DialogTitle>
                {beforePublish ? t("publisherIdentity.introTitlePublish") : t("publisherIdentity.introTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4" data-testid="identity-intro">
              {INTRO_PARTS.map((part) => (
                <div className="flex flex-col gap-1" key={part}>
                  <FieldTitle>{t(`publisherIdentity.${part}Title`)}</FieldTitle>
                  <FieldDescription>{t(`publisherIdentity.${part}Text`)}</FieldDescription>
                </div>
              ))}
              <FieldDescription>{t("publisherIdentity.lead")}</FieldDescription>
            </div>
            <DialogFooter>
              <Button onClick={close} type="button" variant="secondary">
                {t("publisherIdentity.cancel")}
              </Button>
              <Button autoFocus onClick={() => setStep("password")} type="button">
                {t("publisherIdentity.next")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSetUp) setUp();
            }}
          >
            <DialogHeader>
              <CardDescription>{t("publisherIdentity.stepOf", { step: 2, total: 2 })}</CardDescription>
              <DialogTitle>{t("publisherIdentity.passwordTitle")}</DialogTitle>
              <DialogDescription>{t("publisherIdentity.passwordDescription")}</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="identity-password">{t("publisherIdentity.password")}</FieldLabel>
                <Input
                  autoComplete="new-password"
                  autoFocus
                  id="identity-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
                <FieldDescription>
                  {t("publisherIdentity.passwordHint", { count: MIN_IDENTITY_PASSWORD_LENGTH })}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="identity-password-confirmation">
                  {t("publisherIdentity.passwordConfirmation")}
                </FieldLabel>
                <Input
                  aria-invalid={isMismatch}
                  autoComplete="new-password"
                  id="identity-password-confirmation"
                  onChange={(event) => setConfirmation(event.target.value)}
                  type="password"
                  value={confirmation}
                />
                {isMismatch && <FieldError>{t("publisherIdentity.passwordMismatch")}</FieldError>}
              </Field>
            </FieldGroup>
            <Alert data-testid="password-unrecoverable" variant="warning">
              <TriangleAlert aria-hidden="true" />
              <AlertDescription>{t("publisherIdentity.passwordUnrecoverable")}</AlertDescription>
            </Alert>
            {setUpMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>{setUpMutation.error.message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button disabled={setUpMutation.isPending} onClick={() => setStep("intro")} type="button" variant="secondary">
                {t("publisherIdentity.back")}
              </Button>
              <Button data-testid="set-up-identity" disabled={!canSetUp} type="submit">
                {setUpMutation.isPending && <Spinner aria-hidden="true" />}
                {beforePublish ? t("publisherIdentity.setUpAndPublish") : t("publisherIdentity.setUp")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
