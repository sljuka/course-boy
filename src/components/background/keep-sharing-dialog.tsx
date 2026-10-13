import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { useBackgroundPreferences } from "@/lib/background-queries";

// "Keep sharing while Matko is closed?" (SLJ-129): asked once, when the window
// is first closed while there's something to share. Main asks; the answer is
// saved as a preference, and main then hides the window or quits. Closing
// this dialog without answering keeps the window open.
export function KeepSharingDialog() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [, save] = useBackgroundPreferences();

  useEffect(() => window.background.onAskKeepSharing(() => setIsOpen(true)), []);

  function answer(keep: boolean) {
    setIsOpen(false);
    void save({ keepSharingInBackground: keep, ...(keep ? { openAtLogin } : {}) });
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && setIsOpen(false)} open={isOpen}>
      <DialogContent className="w-[min(30rem,calc(100vw-2rem))]" data-testid="keep-sharing-dialog">
        <DialogHeader>
          <DialogTitle>{t("background.askTitle")}</DialogTitle>
          <DialogDescription>{t("background.askBody")}</DialogDescription>
        </DialogHeader>
        <Field orientation="horizontal">
          <Checkbox
            checked={openAtLogin}
            data-testid="keep-sharing-open-at-login"
            id="keep-sharing-open-at-login"
            onCheckedChange={(checked) => setOpenAtLogin(checked === true)}
          />
          <FieldLabel htmlFor="keep-sharing-open-at-login">{t("background.askOpenAtLogin")}</FieldLabel>
        </Field>
        <DialogFooter>
          <Button data-testid="keep-sharing-quit" onClick={() => answer(false)} variant="secondary">
            {t("background.askQuit")}
          </Button>
          <Button autoFocus data-testid="keep-sharing-keep" onClick={() => answer(true)}>
            {t("background.askKeep")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
