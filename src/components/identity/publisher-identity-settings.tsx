import { Download, FileKey } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { IdentitySafetyTips } from "@/components/identity/identity-safety-tips";
import { RestoreIdentityDialog } from "@/components/identity/restore-identity-dialog";
import { RestoredCoursesList } from "@/components/identity/restored-courses-list";
import { SaveIdentityBackupDialog } from "@/components/identity/save-identity-backup-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldTitle } from "@/components/ui/field";
import {
  needsIdentityBackup,
  useIdentityBackupStatusQuery,
  useIdentityRestoreStatusQuery,
} from "@/lib/identity-backup-queries";
import { useAppState } from "@/lib/use-app-state";

// Settings → Security → Publisher identity (SLJ-53): whether the identity
// behind the teacher's online courses is backed up, and Save backup…. It only
// matters once a course is published online: printing or handing course files
// over never needs it, and the section says so instead of asking for anything.
// Until then it offers Restore from backup… (SLJ-54), for a teacher who
// published from another computer; the courses that brings back are listed
// while they're on their way.
export function PublisherIdentitySettings() {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: status } = useIdentityBackupStatusQuery();
  const { data: restoreStatus } = useIdentityRestoreStatusQuery();
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const comingBack = restoreStatus?.courses.some((course) => course.state === "waiting") ? restoreStatus.courses : null;

  // Nothing online yet: nothing to back up, nothing to set up.
  const isOnline = Boolean(status?.available) && (status!.lastBackupAt !== null || status!.coursesNotBackedUp > 0);

  return (
    <>
      {!status || !isOnline ? (
        <Field data-testid="publisher-identity-settings">
          <FieldTitle>{t("identityBackup.settingsTitle")}</FieldTitle>
          <FieldDescription>{t("identityBackup.notOnline")}</FieldDescription>
          <FieldDescription>{t("identityRestore.settingsHint")}</FieldDescription>
          <div>
            <Button
              data-testid="open-restore-identity"
              onClick={() => setIsRestoreOpen(true)}
              size="sm"
              variant="secondary"
            >
              <FileKey aria-hidden="true" />
              {t("identityRestore.settingsButton")}
            </Button>
          </div>
        </Field>
      ) : (
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
          {comingBack && (
            <div className="flex flex-col gap-1">
              <FieldTitle>{t("identityRestore.comingBack")}</FieldTitle>
              <RestoredCoursesList courses={comingBack} />
            </div>
          )}
          <IdentitySafetyTips />
          <div>
            <Button onClick={() => setIsSaveOpen(true)} size="sm" variant="secondary">
              <Download aria-hidden="true" />
              {t("identityBackup.saveButton")}
            </Button>
          </div>
          <SaveIdentityBackupDialog onClose={() => setIsSaveOpen(false)} open={isSaveOpen} />
        </Field>
      )}
      {/* Outside the two branches, so it stays open (with its progress) when a
          restore turns the section "online" behind it. */}
      <RestoreIdentityDialog onClose={() => setIsRestoreOpen(false)} open={isRestoreOpen} />
    </>
  );
}
