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
import { ShareCodeFields } from "@/components/share-code-fields";
import { useProgramSharingQuery } from "@/lib/program-queries";

// A program's code (what students type to get it, SLJ-32 phase 2), its
// import link and a message to send (SLJ-8), each to copy, and how many peers
// are connected. It never changes.
export function ProgramCode({ programId }: { programId: string }) {
  const { t } = useTranslation();
  const { data: sharing } = useProgramSharingQuery(programId, { watchPeers: true });

  if (!sharing) return null;
  if (!sharing.code) {
    return <CardDescription data-testid="program-code-status">{t("programSharing.notPublished")}</CardDescription>;
  }

  const code = sharing.code;
  return (
    <div className="flex flex-col gap-2">
      <ShareCodeFields code={code} codeLabel={t("programSharing.codeLabel")} testId="program-code" />
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
