import { useState } from "react";
import { Printer } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseIndexSidePanel } from "@/components/course-player/course-index-panel";
import { CourseLessonContent } from "@/components/course-player/course-lesson-content";
import { MnemonicsToggle } from "@/components/course-player/mnemonics-toggle";
import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { PrintOptionsMenu } from "@/components/course-player/print-options-menu";
import { CoursePlayerShell } from "@/components/course-player/course-player-shell";
import { PrintDocumentHeader } from "@/components/course-player/print-document-header";
import { useCoursePlayer, type CoursePlayerReadyState } from "@/components/course-player/use-course-player";
import { buildPlayerBreadcrumbs } from "@/components/course-player/player-breadcrumbs";
import { Page } from "@/components/page/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import type { CourseLesson } from "@/lib/course-package";
import { defaultLessonPrintOptions } from "@/lib/print-options";
import { buildLessonTestPath, isIntroStepId } from "@/lib/course-utils";
import { recordStepDone } from "@/lib/course-progress-queries";
import { buildCourseExercisePool } from "@/lib/course-exercise-pool";
import { usePrintDensity } from "@/lib/use-print-density";
import { lessonAppLink } from "@/lib/app-links";

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
  usePrintDensity(printOptions.density);
  const activeLesson = playerState.activeStep.item;

  const playerActions = (
    <CoursePlayerActions
      copyLink={isIntroStepId(activeLesson.id) ? undefined : lessonAppLink(playerState.courseId, activeLesson.id)}
      isRefreshingAvailable={false}
      mnemonicsToggle={<MnemonicsToggle courseId={playerState.courseId} />}
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
            size="icon-sm"
            variant="subtle"
          >
            <Printer aria-hidden="true" />
          </Button>
        </PrintOptionsMenu>
      }
    />
  );

  return (
    <CourseIndexSidePanel
      courseId={playerState.courseId}
      currentItemId={activeLesson.id}
      isPreview={playerState.isPreview}
    >
      <Page
        breadcrumbs={buildPlayerBreadcrumbs(playerState, activeLesson.title)}
        // No heading: the breadcrumbs say which course, section and lesson this
        // is. The action bar only says when it's a section's intro, or that a
        // teacher is previewing. No "Lesson 3 of 9" counter: the course index
        // (SLJ-158) shows where the student is.
        actionBarStart={
          <div className="flex items-center gap-2">
            {playerState.isPreview && <Badge variant="secondary">{t("courseDetails.previewBadge")}</Badge>}
            {!playerState.isPreview && playerState.isSectionIntro && (
              <CardDescription data-testid="lesson-section-intro">{t("courseDetails.sectionIntro")}</CardDescription>
            )}
          </div>
        }
        actions={playerActions}
        keepsActionBarInFullScreen
      >
        <PrintDocumentHeader
          courseTitle={playerState.courseTitle}
          label={t("courseDetails.lessonLabel")}
          show={printOptions.showHeader}
          sectionTitle={playerState.sectionTitle}
          title={activeLesson.title}
        />
        <CourseLessonContent
          activeLesson={activeLesson}
          courseId={playerState.courseId}
          onContinueFromLesson={(lesson) => {
            // Moving past a lesson or a section intro marks it done (SLJ-50);
            // an intro shows Done on the course page but isn't counted in
            // "N of M done" (it isn't one of the course's steps). A preview
            // records nothing.
            if (!playerState.isPreview) {
              recordStepDone(playerState.courseId, lesson.id);
            }
            // A final test (SLJ-136) has exercises when anything in its pool does.
            const hasTest = lesson.test?.includeCourseExercises
              ? buildCourseExercisePool(lesson.test, playerState.courseTests).length > 0
              : (lesson.test?.exercises.length ?? 0) > 0;
            if (!hasTest) {
              playerState.moveToNextStep();
              return;
            }

            navigate(buildLessonTestPath(playerState.courseId, lesson.id));
          }}
        />
      </Page>
    </CourseIndexSidePanel>
  );
}
