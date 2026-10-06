import { RestoreIdentityDialog } from "@/components/identity/restore-identity-dialog";
import { useRestoreIdentityAfterOnboarding } from "@/lib/identity-backup-queries";
import { useAppState } from "@/lib/use-app-state";

// "I have courses published with Matko on another computer" on the
// new-profile screen (SLJ-54): the restore dialog opens once onboarding is
// done. Closing it, restored or not, doesn't bring it back; Settings →
// Security still has Restore from backup….
export function RestoreIdentityAfterOnboarding() {
  const { isOnboarded } = useAppState();
  const [isPending, dismiss] = useRestoreIdentityAfterOnboarding();

  return <RestoreIdentityDialog onClose={dismiss} open={isOnboarded && isPending} />;
}
