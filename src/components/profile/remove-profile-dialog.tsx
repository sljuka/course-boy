import { useState } from "react";
import { useTranslation } from "react-i18next";

import { RemovalChecklistItem } from "@/components/profile/removal-checklist-item";
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
import { useProfileRemovalSummaryQuery, useRemoveProfileMutation } from "@/lib/profiles-queries";

// Removes the open profile (SLJ-61): its folder, with its courses, settings
// and publishing identity. A checklist says what goes, with what it means
// (courses that exist nowhere else; courses that can't be updated without a
// copy of the identity file) and a way to copy them first; Remove is enabled
// only once every item is ticked, and with an identity, its password entered.
export function RemoveProfileDialog({ name, onClose, open }: { name: string; onClose: () => void; open: boolean }) {
  const { t } = useTranslation();
  const { data: summary } = useProfileRemovalSummaryQuery(open);
  const removeMutation = useRemoveProfileMutation();
  const [removeData, setRemoveData] = useState(false);
  const [removeIdentity, setRemoveIdentity] = useState(false);
  const [password, setPassword] = useState("");
  const isWrongPassword = removeMutation.data !== undefined && "error" in removeMutation.data;
  const canRemove =
    Boolean(summary) &&
    removeData &&
    (!summary?.hasIdentity || (removeIdentity && password.length > 0)) &&
    !removeMutation.isPending;

  function close() {
    if (removeMutation.isPending) return;
    setRemoveData(false);
    setRemoveIdentity(false);
    setPassword("");
    removeMutation.reset();
    onClose();
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && close()} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" data-testid="remove-profile-dialog">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canRemove) removeMutation.mutate({ password: summary?.hasIdentity ? password : undefined });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("removeProfile.title", { name })}</DialogTitle>
            <DialogDescription>{t("removeProfile.description")}</DialogDescription>
          </DialogHeader>
          {summary && (
            <div className="flex flex-col gap-4">
              <RemovalChecklistItem
                checked={removeData}
                description={
                  summary.coursesMade > 0
                    ? t("removeProfile.dataCourses", {
                        count: summary.coursesMade,
                        published: summary.coursesMade - summary.coursesNeverPublished,
                      })
                    : t("removeProfile.dataNoCourses")
                }
                id="remove-profile-data"
                onCheckedChange={setRemoveData}
                onOpen={summary.coursesMade > 0 ? () => void window.profiles.openCoursesFolder() : undefined}
                openLabel={t("removeProfile.openCoursesFolder")}
                title={t("removeProfile.data")}
              />
              {summary.hasIdentity && (
                <RemovalChecklistItem
                  checked={removeIdentity}
                  description={
                    summary.coursesPublished > 0
                      ? t(summary.identityRestored ? "removeProfile.identityCoursesAtLeast" : "removeProfile.identityCourses", {
                          count: summary.coursesPublished,
                        })
                      : t("removeProfile.identityNoCourses")
                  }
                  id="remove-profile-identity"
                  onCheckedChange={setRemoveIdentity}
                  onOpen={() => void window.sharing.revealIdentityFile()}
                  openLabel={t("removeProfile.openIdentityFile")}
                  title={t("removeProfile.identity")}
                />
              )}
              {summary.hasIdentity && (
                <Field>
                  <FieldLabel htmlFor="remove-profile-password">{t("removeProfile.password")}</FieldLabel>
                  <Input
                    aria-invalid={isWrongPassword}
                    autoComplete="current-password"
                    id="remove-profile-password"
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    value={password}
                  />
                </Field>
              )}
            </div>
          )}
          {isWrongPassword && (
            <Alert variant="destructive">
              <AlertDescription>{t("removeProfile.wrongPassword")}</AlertDescription>
            </Alert>
          )}
          {removeMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>{removeMutation.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button disabled={removeMutation.isPending} onClick={close} type="button" variant="secondary">
              {t("removeProfile.cancel")}
            </Button>
            <Button data-testid="remove-profile" disabled={!canRemove} type="submit" variant="destructive">
              {removeMutation.isPending && <Spinner aria-hidden="true" />}
              {t("removeProfile.remove")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
