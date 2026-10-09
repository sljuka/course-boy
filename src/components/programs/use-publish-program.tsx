import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { SetUpIdentityDialog } from "@/components/identity/set-up-identity-dialog";
import { UnlockIdentityDialog } from "@/components/identity/unlock-identity-dialog";
import { ProgramCodeDialog } from "@/components/programs/program-code";
import { usePublishProgramMutation } from "@/lib/program-queries";
import { fetchIdentityStatus } from "@/lib/publisher-identity-queries";

// Publish puts a program's current state online (SLJ-32 phase 2) and shows its
// code; students who have it get the change on their own. Like a course's
// Publish (use-publish-with-consent.tsx): the identity is set up first if
// there's none yet, or unlocked if it's still locked this session.
export function usePublishProgram(programId: string): {
  dialogs: ReactNode;
  error: Error | null;
  isPublishing: boolean;
  requestPublish: () => void;
} {
  const { t } = useTranslation();
  const publishMutation = usePublishProgramMutation();
  const [isShowingCode, setIsShowingCode] = useState(false);
  const [waitingFor, setWaitingFor] = useState<"set-up" | "unlock" | null>(null);

  function publish() {
    publishMutation.mutate(programId, { onSuccess: () => setIsShowingCode(true) });
  }

  async function requestPublish() {
    const status = await fetchIdentityStatus().catch(() => null);
    if (status && !status.exists) setWaitingFor("set-up");
    else if (status?.locked) setWaitingFor("unlock");
    else publish();
  }

  function publishWaiting() {
    setWaitingFor(null);
    publish();
  }

  const dialogs = (
    <>
      <SetUpIdentityDialog
        beforePublish
        onClose={() => setWaitingFor(null)}
        onDone={publishWaiting}
        open={waitingFor === "set-up"}
      />
      <UnlockIdentityDialog
        onClose={() => setWaitingFor(null)}
        onUnlocked={publishWaiting}
        open={waitingFor === "unlock"}
      />
      <ProgramCodeDialog
        description={t("programSharing.publishedDescription")}
        onClose={() => setIsShowingCode(false)}
        open={isShowingCode}
        programId={programId}
        title={t("programSharing.publishedTitle")}
      />
    </>
  );

  return {
    dialogs,
    error: publishMutation.error,
    isPublishing: publishMutation.isPending,
    requestPublish: () => void requestPublish(),
  };
}
