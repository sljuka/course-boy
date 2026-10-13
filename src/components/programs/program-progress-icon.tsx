import { useTranslation } from "react-i18next";

import { StatusIcon } from "@/components/ui/status-icon";
import { useCoursesQuery } from "@/lib/course-queries";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { summarizeProgramProgress } from "@/lib/course-progress";
import { useAppState } from "@/lib/use-app-state";

const STATUS_ICONS = { finished: "done", "not-started": "notStarted", started: "changed" } as const;

// Where the student is in a program, as a row's icon (like a course's): a red
// ring before any of its courses is started, amber once one is, green with a
// check once all of them are finished.
export function ProgramProgressIcon({ courseIds }: { courseIds: string[] }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: courses = [] } = useCoursesQuery(locale);
  const { data: progress } = useCourseProgressQuery();
  const status = summarizeProgramProgress(courseIds, courses, progress?.courses);

  return (
    <StatusIcon
      aria-label={t(`programs.progress.${status}`)}
      data-status={status}
      data-testid="program-progress-icon"
      status={STATUS_ICONS[status]}
    />
  );
}
