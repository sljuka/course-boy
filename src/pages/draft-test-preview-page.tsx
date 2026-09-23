import { useMemo } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import { CoursePlayerPageLayout } from "@/components/course-player-page-layout";
import type { CoursePlayerReadyState } from "@/components/course-player/use-course-player";
import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import { toSharedTestDefinition } from "@/components/test-editor-prototype-persistence";
import type { TestEditorState } from "@/components/test-editor-prototype-types";
import { TestPlayerView } from "@/components/test-player/test-player";
import { resolveSharedTestForPlayer } from "@/lib/exercise-kinds/registry";
import type { Locale } from "@/lib/i18n";

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

  const previewPlayerState: CoursePlayerReadyState | undefined = useMemo(() => {
    if (!courseId || !state) {
      return undefined;
    }

    const { selectedNode, supportedLocales, testState } = state;
    const requestedLocales = [testState.selectedLocale, ...supportedLocales].filter(
      (locale, index, locales) => locales.indexOf(locale) === index,
    );
    const sharedTest = toSharedTestDefinition(testState);
    const test = resolveSharedTestForPlayer(sharedTest, requestedLocales, "preview", courseId);
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
          title: testState.title || "Test",
        },
        kind: "lesson",
      },
      courseId: "preview",
      courseTitle: testState.title || "Test",
      exitPlayer: closePreview,
      isPreview: true,
      moveToNextStep: closePreview,
      progressCurrent: 1,
      progressTotal: 1,
      sectionTitle: "",
      status: "ready",
    };
  }, [courseId, navigate, state]);

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
