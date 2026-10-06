import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SaveIdentityBackupDialog } from "@/components/identity/save-identity-backup-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Right after the first Publish (SLJ-53): offer to back up the publisher
// identity, saying plainly what happens without one. "Later" never blocks
// anything; the app menu keeps a reminder dot until a backup exists.
export function IdentityBackupPrompt({ onClose, open }: { onClose: () => void; open: boolean }) {
  const { t } = useTranslation();
  const [isSaveOpen, setIsSaveOpen] = useState(false);

  return (
    <>
      <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open && !isSaveOpen}>
        <DialogContent className="w-[min(30rem,calc(100vw-2rem))]" data-testid="identity-backup-prompt">
          <DialogHeader>
            <DialogTitle>{t("identityBackup.promptTitle")}</DialogTitle>
            <DialogDescription>{t("identityBackup.promptDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose} variant="secondary">
              {t("identityBackup.later")}
            </Button>
            <Button onClick={() => setIsSaveOpen(true)}>{t("identityBackup.saveButton")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SaveIdentityBackupDialog
        onClose={() => {
          setIsSaveOpen(false);
          onClose();
        }}
        open={isSaveOpen}
      />
    </>
  );
}
