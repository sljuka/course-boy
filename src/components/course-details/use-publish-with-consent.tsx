import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { CourseCodeDialog } from "@/components/course-details/course-code-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePublishCourseVersionMutation } from "@/lib/course-queries";
import {
  useAcknowledgeCreatorKeyMutation,
  useHasAcknowledgedCreatorKeyQuery,
} from "@/lib/sharing-queries";

// Publish puts a version online (SLJ-38). The first Publish asks for the sharing
// consent; every Publish then shows the course's code. Creating, editing and
// printing never get here, so teachers who only print never see this.
export function usePublishWithConsent(courseId: string): {
  dialogs: ReactNode;
  publishMutation: ReturnType<typeof usePublishCourseVersionMutation>;
  requestPublish: (version: string) => void;
} {
  const { t } = useTranslation();
  const { data: hasConsent } = useHasAcknowledgedCreatorKeyQuery();
  const acknowledgeMutation = useAcknowledgeCreatorKeyMutation();
  const publishMutation = usePublishCourseVersionMutation();
  const [consentForVersion, setConsentForVersion] = useState<string | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<string | null>(null);

  function publish(version: string) {
    publishMutation.mutate(
      { courseId, version },
      { onSuccess: () => setPublishedVersion(version) },
    );
  }

  function requestPublish(version: string) {
    if (hasConsent) {
      publish(version);
    } else {
      setConsentForVersion(version);
    }
  }

  function confirmConsent() {
    const version = consentForVersion;

    if (!version) {
      return;
    }

    acknowledgeMutation.mutate(undefined, {
      onSuccess: () => {
        setConsentForVersion(null);
        publish(version);
      },
    });
  }

  const dialogs = (
    <>
      <Dialog
        onOpenChange={(open) => !open && !acknowledgeMutation.isPending && setConsentForVersion(null)}
        open={consentForVersion !== null}
      >
        <DialogContent className="w-[min(30rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{t("courseSharing.consentTitle")}</DialogTitle>
            <DialogDescription>{t("courseSharing.consentDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConsentForVersion(null)} variant="secondary">
              {t("courseSharing.cancel")}
            </Button>
            <Button disabled={acknowledgeMutation.isPending} onClick={confirmConsent}>
              {t("courseSharing.consentConfirm", { version: consentForVersion ?? "" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CourseCodeDialog
        courseId={courseId}
        description={t("courseSharing.publishedDescription")}
        onClose={() => setPublishedVersion(null)}
        open={publishedVersion !== null}
        title={t("courseSharing.publishedTitle", { version: publishedVersion ?? "" })}
      />
    </>
  );

  return { dialogs, publishMutation, requestPublish };
}
