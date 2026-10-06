import { Download } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SaveIdentityBackupDialog } from "@/components/identity/save-identity-backup-dialog";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import { useIdentityBackupStatusQuery } from "@/lib/identity-backup-queries";
import { useAppState } from "@/lib/use-app-state";

// Settings → Publisher identity (SLJ-53): whether the identity behind the
// teacher's published courses is backed up, and Save backup…. Shown once
// there's an identity (after the sharing consent at the first Publish).
export function PublisherIdentitySettings() {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: status } = useIdentityBackupStatusQuery();
  const [isSaveOpen, setIsSaveOpen] = useState(false);

  if (!status?.available) {
    return null;
  }

  return (
    <FieldSet className="max-w-xl" data-testid="publisher-identity-settings">
      <FieldLegend>{t("identityBackup.settingsTitle")}</FieldLegend>
      <FieldDescription>{t("identityBackup.settingsDescription")}</FieldDescription>
      <FieldDescription data-testid="identity-backup-status" variant={status.lastBackupAt ? "default" : "destructive"}>
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
    </FieldSet>
  );
}
