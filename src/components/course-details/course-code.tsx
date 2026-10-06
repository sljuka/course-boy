import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { identityBackupStatusKey } from "@/lib/identity-backup-queries";
import { queryClient } from "@/lib/query-client";
import { useCourseSharingQuery } from "@/lib/sharing-queries";

// A course's code (what students type to get it) with a copy button and whether
// the course is online. The code is the same for every version of the course.
export function CourseCode({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: sharing } = useCourseSharingQuery(courseId, { watchPeers: true });
  const [hasCopied, setHasCopied] = useState(false);
  // A course just got its code (went online): the identity backup status
  // (Settings, the reminder dot) now counts it (SLJ-53).
  const hasCode = Boolean(sharing?.code);
  useEffect(() => {
    if (hasCode) void queryClient.invalidateQueries({ queryKey: identityBackupStatusKey });
  }, [hasCode]);

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
    <div className="flex flex-col gap-2">
      <Label htmlFor="course-code">{t("courseSharing.codeLabel")}</Label>
      <div className="flex gap-2">
        <Input data-testid="course-code" id="course-code" readOnly value={code} />
        <Button
          aria-label={t("courseSharing.copyCode")}
          onClick={() => void navigator.clipboard.writeText(code).then(() => setHasCopied(true))}
          size="icon"
          variant="secondary"
        >
          {hasCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </Button>
      </div>
      <div className="flex items-center gap-2" data-testid="course-code-status">
        {sharing.status === "sharing" && <Spinner aria-hidden="true" />}
        <CardDescription>
          {sharing.status === "shared"
            ? sharing.peers === null
              ? t("courseSharing.statusShared")
              : `${t("courseSharing.statusShared")} · ${t("courseSharing.peersOnline", { count: sharing.peers })}`
            : sharing.status === "waiting"
              ? t("courseSharing.statusWaiting")
              : t("courseSharing.statusSharing")}
        </CardDescription>
      </div>
    </div>
  );
}
