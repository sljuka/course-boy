import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useCourseActivityQuery, useSetCollectActivityMutation } from "@/lib/activity-queries";
import { useCourseViewContext } from "@/lib/course-view";

// "Collect activity" in the course form (SLJ-168), an accordion like the
// board's beside it, open and marked "On" while it collects: on unless the
// teacher turns it off. Only on the teacher's device, once the course is
// published. Saved at once: it goes out in the board's moderation list, not
// with the course.
export function CourseActivitySettings({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: activity } = useCourseActivityQuery(courseId);
  const setCollect = useSetCollectActivityMutation(courseId);
  const courseView = useCourseViewContext();
  if (activity?.status !== "ready") return null;

  return (
    <Accordion defaultValue={activity.collect ? ["course-activity"] : []}>
      <AccordionItem value="course-activity">
        <div className="flex items-center gap-1">
          <AccordionTrigger className="flex-none" data-testid="course-activity-toggle">
            {t("courseActivity.settings.title")}
          </AccordionTrigger>
          <InfoTooltip aria-label={t("courseActivity.settings.hint")}>{t("courseActivity.settings.hint")}</InfoTooltip>
          {activity.collect && <Badge variant="success">{t("board.settings.onBadge")}</Badge>}
        </div>
        <AccordionContent>
          <div className="flex flex-col gap-4">
            <Field orientation="horizontal">
              <Checkbox
                checked={activity.collect}
                data-testid="course-activity-collect"
                disabled={setCollect.isPending}
                id={`course-activity-collect-${courseId}`}
                onCheckedChange={(checked) => setCollect.mutate(checked === true)}
              />
              <FieldContent>
                <FieldLabel htmlFor={`course-activity-collect-${courseId}`}>{t("courseActivity.settings.collect")}</FieldLabel>
                <FieldDescription>{t("courseActivity.settings.collectHint")}</FieldDescription>
              </FieldContent>
            </Field>
            {courseView && (
              <div>
                <Button data-testid="course-activity-open" onClick={() => courseView.setView("activity")} size="sm" variant="secondary">
                  <Activity aria-hidden="true" />
                  {t("courseActivity.settings.open")}
                </Button>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
