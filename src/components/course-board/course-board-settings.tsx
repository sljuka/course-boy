import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCourseBoardQuery, useModerateBoardMutation } from "@/lib/board-queries";
import { useCourseViewContext } from "@/lib/course-view";
import { DEFAULT_STUDENT_LIMIT_BYTES } from "@/lib/course-board";
import { formatFileSize } from "@/lib/format-file-size";
import { useAppState } from "@/lib/use-app-state";

const MB = 1024 * 1024;
// What the teacher can let each student's device keep of the board.
const STUDENT_LIMITS = [3 * MB, DEFAULT_STUDENT_LIMIT_BYTES, 30 * MB, 100 * MB];

// The board's settings in the course form (SLJ-149), an accordion like the
// form's others, open and marked "On" while the board is on: the board on or off (off
// by default), how much of it each student's device keeps, and the way to it.
// Only on the teacher's device, once the course is published (the board needs
// its code). Saved at once, like "Show on my channel": they go out in the
// board's moderation list, not with the course.
export function CourseBoardSettings({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: board } = useCourseBoardQuery(courseId);
  const moderate = useModerateBoardMutation(courseId);
  const courseView = useCourseViewContext();
  if (!board || (board.status !== "on" && board.status !== "off") || !board.isTeacher) return null;

  const isOn = board.status === "on";
  const studentLimit = isOn ? board.studentLimitBytes : DEFAULT_STUDENT_LIMIT_BYTES;
  const limits = STUDENT_LIMITS.includes(studentLimit) ? STUDENT_LIMITS : [...STUDENT_LIMITS, studentLimit].sort((a, b) => a - b);

  // Open while the board is on, so its settings show; closed while it's off.
  // (Read once: the component waits for the board before rendering.)
  return (
    <Accordion defaultValue={isOn ? ["course-board"] : []}>
      <AccordionItem value="course-board">
        <div className="flex items-center gap-1">
          <AccordionTrigger className="flex-none" data-testid="course-board-toggle">
            {t("board.settings.enabled")}
          </AccordionTrigger>
          <InfoTooltip aria-label={t("board.settings.enabledHint")}>{t("board.settings.enabledHint")}</InfoTooltip>
          {isOn && <Badge variant="success">{t("board.settings.onBadge")}</Badge>}
        </div>
        <AccordionContent>
          <div className="flex flex-col gap-4">
            <Field orientation="horizontal">
              <Checkbox
                checked={isOn}
                data-testid="board-enabled"
                disabled={moderate.isPending}
                id={`board-enabled-${courseId}`}
                onCheckedChange={(checked) => moderate.mutate({ on: checked === true })}
              />
              <FieldContent>
                <FieldLabel htmlFor={`board-enabled-${courseId}`}>{t("board.settings.turnOn")}</FieldLabel>
              </FieldContent>
            </Field>
            {isOn && (
              <>
                <Field className="gap-8 has-[>[data-slot=field-content]]:items-center" orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor={`board-student-limit-${courseId}`}>{t("board.settings.studentLimit")}</FieldLabel>
                    <FieldDescription>{t("board.settings.studentLimitHint")}</FieldDescription>
                  </FieldContent>
                  <Select
                    onValueChange={(value) => {
                      if (value !== null) moderate.mutate({ studentLimitBytes: value });
                    }}
                    value={studentLimit}
                  >
                    <SelectTrigger className="w-32 shrink-0" data-testid="board-student-limit" id={`board-student-limit-${courseId}`}>
                      <SelectValue>{(value: number) => formatFileSize(value, locale)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {limits.map((limit) => (
                        <SelectItem key={limit} value={limit}>
                          {formatFileSize(limit, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {courseView && (
                  <div>
                    <Button data-testid="board-open" onClick={() => courseView.setView("board")} size="sm" variant="secondary">
                      <MessageSquare aria-hidden="true" />
                      {t("board.settings.open")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
