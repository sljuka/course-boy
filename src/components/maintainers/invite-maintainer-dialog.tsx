import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CopyableCode } from "@/components/copyable-code";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Spinner } from "@/components/ui/spinner";
import { PublisherPicker } from "@/components/publishers/publisher-picker";
import { useInviteMaintainerMutation } from "@/lib/maintainers-queries";
import { usePublishersQuery, useSavePublisherMutation } from "@/lib/publishers-queries";

// Invites one person to maintain a course (SLJ-11, SLJ-67): their publisher
// id first (picked from Publishers, SLJ-108, or entered by hand: they copy it
// from Settings → Sharing; a new one can be saved to Publishers with a name),
// then a code for them alone. Only that publisher can use it (they prove it
// when joining), once, within a week.
export function InviteMaintainerDialog({
  courseId,
  isShared = false,
  onClose,
  open,
}: {
  courseId: string;
  // The course is shared already (SLJ-70): joining doesn't make them a
  // maintainer yet; a change adding them does.
  isShared?: boolean;
  onClose: () => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const [publisherId, setPublisherId] = useState("");
  const [saveAs, setSaveAs] = useState("");
  const inviteMutation = useInviteMaintainerMutation();
  const saveMutation = useSavePublisherMutation();
  const { data: publishers = [] } = usePublishersQuery();
  const code = inviteMutation.data?.code ?? null;
  const trimmedId = publisherId.trim();
  const isKnown = publishers.some((entry) => entry.publisherId === trimmedId);
  const isBusy = inviteMutation.isPending || saveMutation.isPending;

  function close() {
    if (isBusy) return;
    setPublisherId("");
    setSaveAs("");
    inviteMutation.reset();
    saveMutation.reset();
    onClose();
  }

  async function invite() {
    // Saved to Publishers first, when named: next time it's in the list.
    if (!isKnown && saveAs.trim()) await saveMutation.mutateAsync({ label: saveAs.trim(), publisherId: trimmedId });
    inviteMutation.mutate({ courseId, publisherId: trimmedId });
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && close()} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" data-testid="invite-maintainer-dialog">
        <DialogHeader>
          <DialogTitle>{t("maintainers.inviteTitle")}</DialogTitle>
          <DialogDescription>
            {code ? t("maintainers.inviteDescription") : t("maintainers.invitePublisherDescription")}
          </DialogDescription>
        </DialogHeader>
        {code ? (
          <div className="flex flex-col gap-2">
            <CopyableCode label={t("maintainers.inviteCodeLabel")} testId="maintainer-invite-code" value={code} />
            <CardDescription>{isShared ? t("maintainers.inviteSharedWaiting") : t("maintainers.inviteWaiting")}</CardDescription>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <PublisherPicker disabled={isBusy} onPick={setPublisherId} value={publisherId} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maintainer-invitee">{t("maintainers.inviteePublisherId")}</Label>
              <Input
                autoFocus
                data-testid="maintainer-invitee"
                disabled={isBusy}
                id="maintainer-invitee"
                onChange={(event) => setPublisherId(event.target.value)}
                value={publisherId}
              />
            </div>
            {trimmedId && !isKnown && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maintainer-save-as">{t("publishers.saveAs")}</Label>
                <Input
                  data-testid="maintainer-save-as"
                  disabled={isBusy}
                  id="maintainer-save-as"
                  maxLength={80}
                  onChange={(event) => setSaveAs(event.target.value)}
                  placeholder={t("publishers.labelPlaceholder")}
                  value={saveAs}
                />
              </div>
            )}
          </div>
        )}
        {(inviteMutation.error ?? saveMutation.error) && (
          <Alert variant="destructive">
            <AlertDescription>{(inviteMutation.error ?? saveMutation.error)?.message}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          {code ? (
            <Button onClick={close} variant="secondary">
              {t("maintainers.done")}
            </Button>
          ) : (
            <Button
              data-testid="create-maintainer-invite"
              disabled={!trimmedId || isBusy}
              onClick={() => void invite().catch(() => {})}
            >
              {isBusy && <Spinner aria-hidden="true" />}
              {t("maintainers.createInvite")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
