import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { OpenChannelButton } from "@/components/channels/open-channel-button";
import { useCourseChannelQuery } from "@/lib/channel-queries";

// An imported course's channel (SLJ-31), on its page: a link once the channel
// is here and lists the course (that's what makes "by <channel>" true), the
// channel's name with a warning when it doesn't, or "Open channel", which
// brings the channel here by the code the course names.
export function CourseChannelLink({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: channel } = useCourseChannelQuery(courseId);
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
  return <OpenChannelButton channel={{ code: channel.code, programId: null }} testId="open-course-channel" />;
}
