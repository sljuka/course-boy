import { Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  useIdentityStatusQuery,
  useOpenWithoutPublishingMutation,
  useUnlockIdentityMutation,
} from "@/lib/publisher-identity-queries";

// A profile with a publishing identity asks for its password when it opens
// (SLJ-55): the password before Home, or "Open without publishing". Without it
// the profile works for learning, making and printing, and its courses stay
// online; only publishing waits (the first Publish asks again).
export function PublisherPasswordGate({ children }: { children: ReactNode }) {
  const { data: status } = useIdentityStatusQuery();

  if (!status) {
    return null;
  }

  return status.askBeforeHome ? <PublisherPasswordScreen /> : <>{children}</>;
}

function PublisherPasswordScreen() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const unlockMutation = useUnlockIdentityMutation();
  const skipMutation = useOpenWithoutPublishingMutation();
  const isWrong = unlockMutation.data !== undefined && "error" in unlockMutation.data;
  const isBusy = unlockMutation.isPending || skipMutation.isPending;

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
      <section className="flex w-full max-w-md flex-col items-center gap-3">
        <Card className="w-full" data-testid="publisher-password-gate">
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (password && !isBusy) unlockMutation.mutate({ password });
              }}
            >
              <div className="flex flex-col gap-1">
                <CardTitle>{t("publisherIdentity.gateTitle")}</CardTitle>
                <CardDescription>{t("publisherIdentity.gateDescription")}</CardDescription>
              </div>
              <Field>
                <FieldLabel htmlFor="publisher-password-gate">{t("publisherIdentity.password")}</FieldLabel>
                <Input
                  aria-invalid={isWrong}
                  autoComplete="current-password"
                  autoFocus
                  id="publisher-password-gate"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
                <FieldDescription>{t("publisherIdentity.gateForgotten")}</FieldDescription>
              </Field>
              {isWrong && (
                <Alert variant="destructive">
                  <AlertDescription>{t("publisherIdentity.wrongPassword")}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button data-testid="unlock-identity" disabled={!password || isBusy} type="submit">
                  {unlockMutation.isPending && <Spinner aria-hidden="true" />}
                  {t("publisherIdentity.unlock")}
                </Button>
                <Button
                  data-testid="open-without-publishing"
                  disabled={isBusy}
                  onClick={() => skipMutation.mutate()}
                  type="button"
                  variant="ghost"
                >
                  {t("publisherIdentity.openWithoutPublishing")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Button onClick={() => void window.profiles.switchProfile()} size="sm" variant="ghost">
          <Users aria-hidden="true" />
          {t("menu.switchProfile")}
        </Button>
      </section>
    </main>
  );
}
