import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { CourseCodeDialog } from "@/components/course-details/course-code-dialog";
import { SetUpIdentityDialog } from "@/components/identity/set-up-identity-dialog";
import { UnlockIdentityDialog } from "@/components/identity/unlock-identity-dialog";
import { usePublishCourseVersionMutation } from "@/lib/course-queries";
import { useMaintainersQuery } from "@/lib/maintainers-queries";
import { fetchIdentityStatus } from "@/lib/publisher-identity-queries";

// Publish puts a version online (SLJ-38), signed with the publishing identity,
// and then shows the course's code. Creating, editing and printing never get
// here, so teachers who only print never see this.
//
// Before it publishes (SLJ-55): without an identity yet, the setup wizard runs
// (what going online, signing and the identity file are, then a password) and
// publishes once it's done; cancelling it cancels the Publish. With the
// identity still locked this session ("Open without publishing"), it asks for
// the password first.
//
// A course maintained with others (SLJ-11): Publish asks them for approval.
// The version goes online once enough of them approve it, so the dialog
// after it says that, with the course's (shared) code.
export function usePublishWithConsent(courseId: string): {
  dialogs: ReactNode;
  // Publish asks the other maintainers for approval.
  isShared: boolean;
  publishMutation: ReturnType<typeof usePublishCourseVersionMutation>;
  requestPublish: (version: string) => void;
} {
  const { t } = useTranslation();
  const publishMutation = usePublishCourseVersionMutation();
  const { data: maintainers } = useMaintainersQuery(courseId);
  const isShared = Boolean(maintainers?.sharedKey);
  const [publishedVersion, setPublishedVersion] = useState<string | null>(null);
  // The version waiting for the identity to be set up, or unlocked.
  const [setUpForVersion, setSetUpForVersion] = useState<string | null>(null);
  const [unlockForVersion, setUnlockForVersion] = useState<string | null>(null);

  function publish(version: string) {
    publishMutation.mutate({ courseId, version }, { onSuccess: () => setPublishedVersion(version) });
  }

  async function requestPublish(version: string) {
    const status = await fetchIdentityStatus().catch(() => null);

    if (status && !status.exists) {
      setSetUpForVersion(version);
    } else if (status?.locked) {
      setUnlockForVersion(version);
    } else {
      publish(version);
    }
  }

  // After the wizard or the password: publish the version that waited.
  function publishWaiting(version: string | null) {
    setSetUpForVersion(null);
    setUnlockForVersion(null);
    if (version) publish(version);
  }

  const dialogs = (
    <>
      <SetUpIdentityDialog
        beforePublish
        onClose={() => setSetUpForVersion(null)}
        onDone={() => publishWaiting(setUpForVersion)}
        open={setUpForVersion !== null}
      />
      <UnlockIdentityDialog
        onClose={() => setUnlockForVersion(null)}
        onUnlocked={() => publishWaiting(unlockForVersion)}
        open={unlockForVersion !== null}
      />
      <CourseCodeDialog
        courseId={courseId}
        description={
          isShared
            ? t("maintainers.sentDescription", { count: maintainers?.quorum ?? 0 })
            : t("courseSharing.publishedDescription")
        }
        onClose={() => setPublishedVersion(null)}
        open={publishedVersion !== null}
        showChannelListing={!isShared}
        title={
          isShared
            ? t("maintainers.sentTitle", { version: publishedVersion ?? "" })
            : t("courseSharing.publishedTitle", { version: publishedVersion ?? "" })
        }
      />
    </>
  );

  return { dialogs, isShared, publishMutation, requestPublish: (version) => void requestPublish(version) };
}
