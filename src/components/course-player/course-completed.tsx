import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { RetakeCourseDialog } from "@/components/course-progress/retake-course-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { firstStepNotDone } from "@/lib/course-entry";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { summarizeCourseProgress } from "@/lib/course-progress";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { buildLessonPath, buildLessonTestPath, getEntryStep } from "@/lib/course-utils";
import { useAppState } from "@/lib/use-app-state";

// What the student sees after moving on from the course's last step
// (SLJ-171). It says what's true from their progress: "Course complete" only
// when every lesson and test is done (with Retake course), else "You reached
// the end" with how many steps are done and a way back to the first one
// missing (skipping ahead with the course index lands here too). A preview
// keeps no progress, so it only offers to close.
export const CourseCompleted = ({ courseId, onExitPlayer }: { courseId: string; onExitPlayer: () => void }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale } = useAppState();
  const { data: course } = useCourseDetailsQuery(courseId, locale);
  const { data: progress } = useCourseProgressQuery();
  const [isRetakeOpen, setIsRetakeOpen] = useState(false);
  const courseProgress = progress?.courses[courseId];
  const summary = course ? summarizeCourseProgress(course.stepIds, courseProgress) : null;
  const isComplete = !course || course.preview || Boolean(summary?.completedAt);
  const missing = course && !isComplete ? firstStepNotDone(course.sections, courseProgress) : null;

  function openFirstStep() {
    const entry = course ? getEntryStep(course) : null;
    if (!entry) return;
    navigate(entry.kind === "lesson" ? buildLessonPath(courseId, entry.id) : buildLessonTestPath(courseId, entry.id));
  }

  return (
    <Card className="flex flex-1 items-center justify-center overflow-hidden border-border bg-card/90 shadow-none">
      <CardContent
        className="max-w-2xl items-center justify-center py-16 text-center"
        data-end={isComplete ? "complete" : "reached-end"}
        data-steps-done={summary?.done}
        data-testid="course-end"
      >
        <h3 className="text-3xl font-semibold text-foreground">
          {isComplete ? t("courseDetails.completedTitle") : t("courseEntry.reachedEndTitle")}
        </h3>
        <p className="text-base leading-7 text-muted-foreground">
          {isComplete
            ? t("courseDetails.completedDescription")
            : t("courseEntry.reachedEndDescription", { done: summary?.done ?? 0, total: summary?.total ?? 0 })}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {missing && (
            <Button
              data-testid="course-end-missing"
              onClick={() =>
                navigate(
                  missing.kind === "lesson"
                    ? buildLessonPath(courseId, missing.id)
                    : buildLessonTestPath(courseId, missing.lessonId),
                )
              }
              size="lg"
            >
              {t("courseEntry.goToMissing")}
            </Button>
          )}
          {isComplete && course && !course.preview && (
            <Button data-testid="course-end-retake" onClick={() => setIsRetakeOpen(true)} size="lg" variant="secondary">
              {t("courseEntry.retake")}
            </Button>
          )}
          <Button onClick={onExitPlayer} size="lg" variant={missing ? "secondary" : "default"}>
            {t("courseDetails.closeCourse")}
          </Button>
        </div>
      </CardContent>
      <RetakeCourseDialog
        course={isRetakeOpen && course ? { id: courseId, title: course.title } : null}
        onOpen={openFirstStep}
        onOpenChange={setIsRetakeOpen}
      />
    </Card>
  );
};
