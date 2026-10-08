import { useCourseProgressLabel } from "@/components/course-progress/course-progress-label";
import { Badge } from "@/components/ui/badge";
import { type CourseProgress, summarizeCourseProgress } from "@/lib/course-progress";

// On a course's page (SLJ-50): "3 of 8 done", or "Finished"; nothing before
// the student starts it. Counted over the course's lessons and tests as they
// are now (`stepIds`; section intros aren't steps).
export function CourseProgressBadge({
  course,
  progress,
}: {
  course: { stepIds: string[] };
  progress: CourseProgress | undefined;
}) {
  const summary = summarizeCourseProgress(course.stepIds, progress);
  const label = useCourseProgressLabel(summary, Boolean(progress?.startedAt));

  if (!label) return null;

  return (
    <div>
      <Badge data-testid="course-progress-label" variant={summary.completedAt ? "success" : "secondary"}>
        {label}
      </Badge>
    </div>
  );
}
