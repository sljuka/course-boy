import { FileKey, FolderOpen, KeyRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { IdentitySafetyTips } from "@/components/identity/identity-safety-tips";
import { RestoreIdentityDialog } from "@/components/identity/restore-identity-dialog";
import { RestoredCoursesList } from "@/components/identity/restored-courses-list";
import { SetUpIdentityDialog } from "@/components/identity/set-up-identity-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldTitle } from "@/components/ui/field";
import { useIdentityRestoreStatusQuery, useIdentityStatusQuery } from "@/lib/publisher-identity-queries";

// Settings → Publishing → Publishing identity (SLJ-55). Before it's set up:
// what it's for, "Set up your publishing identity" (the same wizard as the
// first Publish), and "Restore from a file…" for a teacher who published from
// another computer. Set up: "Open identity file" shows the file to copy (it's
// the backup), with how to keep it safe; after a restore, the courses found.
export function PublisherIdentitySettings() {
  const { t } = useTranslation();
  const { data: status } = useIdentityStatusQuery();
  const { data: restoreStatus } = useIdentityRestoreStatusQuery();
  const [isSetUpOpen, setIsSetUpOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  if (!status) {
    return null;
  }

  return (
    <>
      {status.exists ? (
        <Field data-testid="publisher-identity-settings">
          <FieldTitle>{t("publisherIdentity.settingsTitle")}</FieldTitle>
          <FieldDescription>{t("publisherIdentity.settingsDescription")}</FieldDescription>
          <FieldDescription>{t("publisherIdentity.fileNote")}</FieldDescription>
          <div>
            <Button
              data-testid="reveal-identity-file"
              onClick={() => void window.sharing.revealIdentityFile()}
              size="sm"
              variant="secondary"
            >
              <FolderOpen aria-hidden="true" />
              {t("publisherIdentity.openFile")}
            </Button>
          </div>
          <IdentitySafetyTips />
          {restoreStatus && (restoreStatus.searching || restoreStatus.courses.length > 0) && (
            <div className="flex flex-col gap-1">
              <FieldTitle>{t("identityRestore.comingBack")}</FieldTitle>
              <RestoredCoursesList status={restoreStatus} />
            </div>
          )}
        </Field>
      ) : (
        <Field data-testid="publisher-identity-settings">
          <FieldTitle>{t("publisherIdentity.settingsTitle")}</FieldTitle>
          <FieldDescription>{t("publisherIdentity.notSetUp")}</FieldDescription>
          <div className="flex flex-wrap gap-2">
            <Button data-testid="open-set-up-identity" onClick={() => setIsSetUpOpen(true)} size="sm" variant="secondary">
              <KeyRound aria-hidden="true" />
              {t("publisherIdentity.setUpButton")}
            </Button>
            <Button data-testid="open-restore-identity" onClick={() => setIsRestoreOpen(true)} size="sm" variant="secondary">
              <FileKey aria-hidden="true" />
              {t("identityRestore.settingsButton")}
            </Button>
          </div>
          <FieldDescription>{t("identityRestore.settingsHint")}</FieldDescription>
        </Field>
      )}
      <SetUpIdentityDialog onClose={() => setIsSetUpOpen(false)} open={isSetUpOpen} />
      {/* Outside the two branches, so it stays open (with its progress) when a
          restore sets the identity up behind it. */}
      <RestoreIdentityDialog onClose={() => setIsRestoreOpen(false)} open={isRestoreOpen} />
    </>
  );
}
