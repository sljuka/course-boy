import { useMemo } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import { CoursePlayerPageLayout } from "@/components/course-player-page-layout";
import type { CoursePlayerReadyState } from "@/components/course-player/use-course-player";
import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import { toSharedTestDefinition } from "@/components/test-editor-prototype-persistence";
import type { TestEditorState } from "@/components/test-editor-prototype-types";
import { TestPlayerView } from "@/components/test-player/test-player";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { resolveSharedTestForPlayer } from "@/lib/exercise-kinds/registry";
import type { Locale } from "@/lib/i18n";
import { listCourseTests } from "@/lib/course-exercise-pool";

type DraftTestPreviewLocationState = {
  // The tree node the teacher had selected in the draft editor when they hit
  // "Preview test" — round-tripped back through `CourseLayout` on close so
  // returning lands back on the same test instead of resetting to the course
  // root (see `CourseLayout`'s own `selectedNode` initializer).
  selectedNode?: StructureSelection;
  supportedLocales: Locale[];
  testState: TestEditorState;
};

/**
 * A dedicated route for the draft editor's "Preview test" action — renders
 * the exact same page a student sees (`TestPlayerView`), see "Previewing a
 * draft test" in docs/persistence-notes.md. This used to be a `fixed`
 * overlay stacked on top of the still-mounted editor; it's a real route
 * instead because printing a positioned overlay doesn't paginate (Chromium
 * clips it to one viewport-height box and bakes a scrollbar into the output
 * rather than flowing content across physical pages). A route sidesteps that
 * whole class of bug instead of needing print-specific CSS to undo the
 * overlay's own screen-only layout.
 */
export function DraftTestPreviewPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as DraftTestPreviewLocationState | null;
  // The course's and the section's names, for the printed header. The test
  // is the selected node: a section's own test, or a lesson's.
  const { data: course } = useCourseDetailsQuery(courseId, state?.testState.selectedLocale ?? "en");
  const testId = state?.selectedNode?.id;
  const section = course?.sections.find(
    (candidate) =>
      candidate.tests.some((test) => test.id === testId) ||
      candidate.lessons.some((lesson) => lesson.id === testId),
  );

  const previewPlayerState: CoursePlayerReadyState | undefined = useMemo(() => {
    if (!courseId || !state) {
      return undefined;
    }

    const { selectedNode, supportedLocales, testState } = state;
    const requestedLocales = [testState.selectedLocale, ...supportedLocales].filter(
      (locale, index, locales) => locales.indexOf(locale) === index,
    );
    const sharedTest = toSharedTestDefinition(testState);
    // Under its own id, so a final test's pool (SLJ-136) has the version
    // being edited in place of the saved one, not both.
    const resolvedTest = resolveSharedTestForPlayer(sharedTest, requestedLocales, selectedNode?.id ?? "preview", courseId);
    // The preview plays every test as a lesson's: the start screen's default
    // (SLJ-137) follows what the test really is.
    const isSectionTest = section?.tests.some((candidate) => candidate.id === testId) ?? false;
    const test = { ...resolvedTest, showStartScreen: resolvedTest.showStartScreen ?? isSectionTest };
    const closePreview = () =>
      navigate(`/drafts/${courseId}`, { state: selectedNode ? { selectedNode } : undefined });

    return {
      activeStep: {
        item: {
          body: "",
          description: testState.description,
          iconUrl: null,
          id: "preview",
          test,
          title: selectedNode?.title || "Test",
        },
        kind: "lesson",
      },
      courseId: "preview",
      courseGradeBands: course?.gradeBands ?? null,
      courseTests: course ? listCourseTests(course.sections) : [],
      courseTitle: course?.title ?? "",
      exitPlayer: closePreview,
      isPreview: true,
      isSectionIntro: false,
      moveToNextStep: closePreview,
      progressCurrent: 1,
      progressTotal: 1,
      sectionTitle: section?.title ?? "",
      status: "ready",
    };
  }, [course, courseId, navigate, section, state, testId]);

  if (!courseId) {
    return <Navigate replace to="/my-courses" />;
  }

  if (!previewPlayerState) {
    // No in-memory draft to preview — this route only makes sense as the
    // target of the editor's own "Preview test" click, which always supplies
    // `location.state`. A direct navigation or a reload lands here instead.
    return <Navigate replace to={`/drafts/${courseId}`} />;
  }

  return (
    <CoursePlayerPageLayout playerKey="preview-test">
      <TestPlayerView playerState={previewPlayerState} />
    </CoursePlayerPageLayout>
  );
}
