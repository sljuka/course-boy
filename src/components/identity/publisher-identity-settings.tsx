import { Download } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SaveIdentityBackupDialog } from "@/components/identity/save-identity-backup-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldTitle } from "@/components/ui/field";
import { needsIdentityBackup, useIdentityBackupStatusQuery } from "@/lib/identity-backup-queries";
import { useAppState } from "@/lib/use-app-state";

// Settings → Security → Publisher identity (SLJ-53): whether the identity
// behind the teacher's online courses is backed up, and Save backup…. It only
// matters once a course is published online: printing or handing course files
// over never needs it, and the section says so instead of asking for anything.
export function PublisherIdentitySettings() {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: status } = useIdentityBackupStatusQuery();
  const [isSaveOpen, setIsSaveOpen] = useState(false);

  // Nothing online yet: nothing to back up, nothing to set up.
  const isOnline = Boolean(status?.available) && (status!.lastBackupAt !== null || status!.coursesNotBackedUp > 0);

  if (!status || !isOnline) {
    return (
      <Field data-testid="publisher-identity-settings">
        <FieldTitle>{t("identityBackup.settingsTitle")}</FieldTitle>
        <FieldDescription>{t("identityBackup.notOnline")}</FieldDescription>
      </Field>
    );
  }

  return (
    <Field data-testid="publisher-identity-settings">
      <FieldTitle>{t("identityBackup.settingsTitle")}</FieldTitle>
      <FieldDescription>{t("identityBackup.settingsDescription")}</FieldDescription>
      <FieldDescription
        data-testid="identity-backup-status"
        variant={needsIdentityBackup(status) ? "destructive" : "default"}
      >
        {status.lastBackupAt
          ? t("identityBackup.backedUpOn", {
              date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(status.lastBackupAt)),
            })
          : t("identityBackup.notBackedUp")}
        {status.lastBackupAt &&
          status.coursesNotBackedUp > 0 &&
          ` ${t("identityBackup.coursesSince", { count: status.coursesNotBackedUp })}`}
      </FieldDescription>
      <div>
        <Button onClick={() => setIsSaveOpen(true)} size="sm" variant="secondary">
          <Download aria-hidden="true" />
          {t("identityBackup.saveButton")}
        </Button>
      </div>
      <SaveIdentityBackupDialog onClose={() => setIsSaveOpen(false)} open={isSaveOpen} />
    </Field>
  );
}
