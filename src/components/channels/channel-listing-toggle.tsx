import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { useCourseChannelQuery, useSetCourseListedMutation } from "@/lib/channel-queries";

// "Show on my channel" (SLJ-31), for a course of yours that's published: on
// your channel, students who open it see the course there. Not shown for a
// course you haven't published, or an imported one.
export function ChannelListingToggle({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: channel } = useCourseChannelQuery(courseId);
  const listedMutation = useSetCourseListedMutation();
  if (!channel || channel.listed === null) return null;

  return (
    <Field orientation="horizontal">
      <Checkbox
        checked={channel.listed}
        data-testid="show-on-channel"
        disabled={listedMutation.isPending}
        id={`show-on-channel-${courseId}`}
        onCheckedChange={(checked) => listedMutation.mutate({ courseId, listed: checked === true })}
      />
      <FieldContent>
        <FieldLabel htmlFor={`show-on-channel-${courseId}`}>{t("channels.showOnChannel")}</FieldLabel>
        <FieldDescription>{t("channels.showOnChannelHint")}</FieldDescription>
      </FieldContent>
    </Field>
  );
}
