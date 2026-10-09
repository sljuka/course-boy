import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The code that lets one person join a course as a maintainer (SLJ-11). It's
// the only thing they need, so it's sent to them alone, privately.
export function InviteMaintainerDialog({ code, onClose }: { code: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [hasCopied, setHasCopied] = useState(false);

  function close() {
    setHasCopied(false);
    onClose();
  }

  return (
    <Dialog onOpenChange={(open) => !open && close()} open={code !== null}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" data-testid="invite-maintainer-dialog">
        <DialogHeader>
          <DialogTitle>{t("maintainers.inviteTitle")}</DialogTitle>
          <DialogDescription>{t("maintainers.inviteDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maintainer-invite-code">{t("maintainers.inviteCodeLabel")}</Label>
          <div className="flex gap-2">
            <Input data-testid="maintainer-invite-code" id="maintainer-invite-code" readOnly value={code ?? ""} />
            <Button
              aria-label={t("maintainers.copyCode")}
              onClick={() => void navigator.clipboard.writeText(code ?? "").then(() => setHasCopied(true))}
              size="icon"
              variant="secondary"
            >
              {hasCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </Button>
          </div>
          <CardDescription>{t("maintainers.inviteWaiting")}</CardDescription>
        </div>
        <DialogFooter>
          <Button onClick={close} variant="secondary">
            {t("maintainers.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
