import { useState } from "react";
import { Printer } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseLessonContent } from "@/components/course-player/course-lesson-content";
import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { PrintOptionsMenu } from "@/components/course-player/print-options-menu";
import { CoursePlayerShell } from "@/components/course-player/course-player-shell";
import { PrintDocumentHeader } from "@/components/course-player/print-document-header";
import { useCoursePlayer, type CoursePlayerReadyState } from "@/components/course-player/use-course-player";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import type { CourseLesson } from "@/lib/course-package";
import { defaultLessonPrintOptions } from "@/lib/print-options";
import { buildLessonTestPath } from "@/lib/course-utils";

// `CoursePlayerReadyState.activeStep` is a `{item: CourseLesson, kind: "lesson"} |
// {item: CourseSectionTest, kind: "test"}` union — narrowed to the lesson
// variant here since `LessonPlayerView` reads lesson-only fields like `body`.
// Every caller (both `LessonPlayer`, after its own "no document" redirect
// check below, and `DraftLessonPreviewPage`, which only ever builds a
// lesson step) already satisfies this.
export type LessonPlayerReadyState = CoursePlayerReadyState & {
  activeStep: { item: CourseLesson; kind: "lesson" };
};

export function LessonPlayer({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const playerState = useCoursePlayer({ courseId, lessonId });

  if (playerState.status !== "ready") {
    return <CoursePlayerShell playerState={playerState} />;
  }

  // This route has no document to show for a standalone test — send the
  // reader straight to its test instead.
  if (playerState.activeStep.kind === "test") {
    return (
      <Navigate
        replace
        to={buildLessonTestPath(courseId, playerState.activeStep.item.id)}
      />
    );
  }

  return (
    <CoursePlayerShell playerState={playerState}>
      {/* The `kind === "test"` check above narrows `playerState.activeStep`
          when accessed directly, but TS doesn't carry that narrowing into
          `playerState`'s own static type — this cast just names what's
          already been checked. */}
      <LessonPlayerView playerState={playerState as LessonPlayerReadyState} />
    </CoursePlayerShell>
  );
}

/**
 * The document-reading experience, split out from `LessonPlayer` so the
 * draft editor's "Preview document" can render the *exact* same UI a
 * student sees by supplying its own in-memory `CoursePlayerReadyState`
 * instead of one loaded from disk via `useCoursePlayer` — same pattern as
 * `TestPlayerView` (see `src/components/test-player/test-player.tsx`).
 */
export function LessonPlayerView({
  playerState,
}: {
  playerState: LessonPlayerReadyState;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [printOptions, setPrintOptions] = useState(defaultLessonPrintOptions);
  const activeLesson = playerState.activeStep.item;

  return (
    <>
      <PrintDocumentHeader
        courseTitle={playerState.courseTitle}
        label={t("courseDetails.lessonLabel")}
        show={printOptions.showHeader}
        sectionTitle={playerState.sectionTitle}
        title={activeLesson.title}
      />
      <div className="print:hidden">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <CardTitle size="lg">{playerState.courseTitle}</CardTitle>
              {playerState.isPreview && (
                <Badge variant="secondary">{t("courseDetails.previewBadge")}</Badge>
              )}
            </div>
          }
          subtitle={
            // The section/progress line is synthetic in preview (a single
            // fake "Preview" section, always "1 of 1") — skip it there,
            // same as `TestPlayerView` does.
            !playerState.isPreview && (
              <CardDescription className="text-base">
                {playerState.sectionTitle}
                {" · "}
                {t("courseDetails.progress", {
                  current: playerState.progressCurrent,
                  total: playerState.progressTotal,
                })}
              </CardDescription>
            )
          }
          right={
            <CoursePlayerActions
              isRefreshingAvailable={false}
              onClose={playerState.exitPlayer}
              onRefreshExercise={() => {}}
              printControl={
                <PrintOptionsMenu
                  mode="lesson"
                  onPrint={() => window.print()}
                  onPrintOptionsChange={setPrintOptions}
                  printOptions={printOptions}
                >
                  <Button
                    aria-label={t("courseDetails.printCourse")}
                    shape="circle"
                    size="icon"
                    variant="secondary"
                  >
                    <Printer aria-hidden="true" className="h-5 w-5" />
                  </Button>
                </PrintOptionsMenu>
              }
            />
          }
        />
      </div>
      <CourseLessonContent
        activeLesson={activeLesson}
        courseId={playerState.courseId}
        onContinueFromLesson={(lesson) => {
          if (!lesson.test || lesson.test.exercises.length === 0) {
            playerState.moveToNextStep();
            return;
          }

          navigate(buildLessonTestPath(playerState.courseId, lesson.id));
        }}
      />
    </>
  );
}
