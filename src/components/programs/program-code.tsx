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
import { useProgramSharingQuery } from "@/lib/program-queries";

// A program's code (what students type to get it, SLJ-32 phase 2) with a copy
// button and how many peers are connected. It never changes.
export function ProgramCode({ programId }: { programId: string }) {
  const { t } = useTranslation();
  const { data: sharing } = useProgramSharingQuery(programId, { watchPeers: true });
  const [hasCopied, setHasCopied] = useState(false);

  if (!sharing) return null;
  if (!sharing.code) {
    return <CardDescription data-testid="program-code-status">{t("programSharing.notPublished")}</CardDescription>;
  }

  const code = sharing.code;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="program-code">{t("programSharing.codeLabel")}</Label>
      <div className="flex gap-2">
        <Input data-testid="program-code" id="program-code" readOnly value={code} />
        <Button
          aria-label={t("programSharing.copyCode")}
          onClick={() => void navigator.clipboard.writeText(code).then(() => setHasCopied(true))}
          size="icon"
          variant="secondary"
        >
          {hasCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </Button>
      </div>
      {sharing.peers !== null && (
        <CardDescription data-testid="program-code-status">
          {t("programSharing.peersOnline", { count: sharing.peers })}
        </CardDescription>
      )}
    </div>
  );
}

export function ProgramCodeDialog({
  description,
  onClose,
  open,
  programId,
  title,
}: {
  description: string;
  onClose: () => void;
  open: boolean;
  programId: string;
  title: string;
}) {
  const { t } = useTranslation();

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ProgramCode programId={programId} />
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">
            {t("programSharing.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
