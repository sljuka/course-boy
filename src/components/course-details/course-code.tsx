import { useTranslation } from "react-i18next";

import { PeersCount } from "@/components/peers-count";
import { ShareCodeFields } from "@/components/share-code-fields";
import { CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useCourseSharingQuery } from "@/lib/sharing-queries";

// A course's code (what students type to get it), its import link and a
// message to send (SLJ-8), each to copy, and whether the course is online.
// The code is the same for every version of the course.
export function CourseCode({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: sharing } = useCourseSharingQuery(courseId, { watchPeers: true });

  if (!sharing) {
    return null;
  }

  // Right after Publish there's no code yet: the course is still going online.
  if (!sharing.code && sharing.status === "sharing") {
    return (
      <div className="flex items-center gap-2" data-testid="course-code-status">
        <Spinner aria-hidden="true" />
        <CardDescription>{t("courseSharing.statusSharing")}</CardDescription>
      </div>
    );
  }

  if (!sharing.code) {
    return (
      <CardDescription data-testid="course-code-status">
        {sharing.status === "not-shared"
          ? t("courseSharing.notPublished")
          : t("courseSharing.statusWaiting")}
      </CardDescription>
    );
  }

  const code = sharing.code;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ShareCodeFields code={code} codeLabel={t("courseSharing.codeLabel")} testId="course-code" />
      <div className="flex items-center gap-2" data-testid="course-code-status">
        {sharing.status === "sharing" && <Spinner aria-hidden="true" />}
        <CardDescription>
          {sharing.status === "shared" ? (
            <>
              {t("courseSharing.statusShared")}
              {sharing.peers !== null && (
                <>
                  {" · "}
                  <PeersCount count={sharing.peers} />
                </>
              )}
            </>
          ) : sharing.status === "waiting"
              ? t("courseSharing.statusWaiting")
              : t("courseSharing.statusSharing")}
        </CardDescription>
      </div>
    </div>
  );
}
