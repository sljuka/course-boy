import { Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCourseChannelQuery } from "@/lib/channel-queries";
import { useImportCourseMutation } from "@/lib/sharing-queries";

// An imported course's channel (SLJ-31), on its page: a link once the channel
// is here and lists the course (that's what makes "by <channel>" true), the
// channel's name with a warning when it doesn't, or "Open channel", which
// brings the channel here by the code the course names.
export function CourseChannelLink({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: channel } = useCourseChannelQuery(courseId);
  const importMutation = useImportCourseMutation();
  if (!channel || channel.listed !== null || !channel.code) return null;

  if (channel.programId && channel.verified) {
    return (
      <Link data-testid="course-channel" to={`/channels/${channel.programId}`}>
        {channel.title || t("channels.untitled")}
      </Link>
    );
  }
  if (channel.programId) {
    return <span data-testid="course-channel-unverified">{t("channels.doesNotList", { title: channel.title ?? "" })}</span>;
  }
  return (
    <Button
      data-testid="open-course-channel"
      disabled={importMutation.isPending}
      onClick={() =>
        importMutation.mutate(
          { code: channel.code! },
          { onSuccess: (result) => "programId" in result && navigate(`/channels/${result.programId}`) },
        )
      }
      size="xs"
      variant="secondary"
    >
      {importMutation.isPending ? <Spinner aria-hidden="true" /> : <Radio aria-hidden="true" />}
      {t("channels.open")}
    </Button>
  );
}
