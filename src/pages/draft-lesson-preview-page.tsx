import { useMemo } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import { CoursePlayerPageLayout } from "@/components/course-player-page-layout";
import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import { LessonPlayerView, type LessonPlayerReadyState } from "@/components/lesson-player";
import type { CourseTest } from "@/lib/course-package";

type DraftLessonPreviewLocationState = {
  // The lesson document's markdown body, converted from the currently
  // active locale's *live* (possibly unsaved) BlockNote blocks — see
  // `blocksToMarkdown` in `draft-document-editor.tsx`'s "Preview document"
  // handler. Mirrors how `DraftTestPreviewPage` previews live exercise
  // edits rather than only the last-saved content.
  body: string;
  selectedNode?: StructureSelection;
  test: CourseTest | null;
};

/**
 * A dedicated route for the draft document editor's "Preview document"
 * action, same shape as `DraftTestPreviewPage` — renders the exact page a
 * student sees (`LessonPlayerView`) from an in-memory `CoursePlayerReadyState`
 * instead of one loaded from disk.
 */
export function DraftLessonPreviewPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as DraftLessonPreviewLocationState | null;

  const previewPlayerState: LessonPlayerReadyState | undefined = useMemo(() => {
    if (!courseId || !state) {
      return undefined;
    }

    const { body, selectedNode, test } = state;
    const closePreview = () =>
      navigate(`/drafts/${courseId}`, { state: selectedNode ? { selectedNode } : undefined });

    return {
      activeStep: {
        item: {
          body,
          description: "",
          iconUrl: null,
          id: "preview",
          test,
          title: selectedNode?.title || "Document",
        },
        kind: "lesson",
      },
      // Unlike `DraftTestPreviewPage`, this needs the *real* course id —
      // `LessonBlocks` resolves uploaded image/video URLs via
      // `matko-asset://<courseId>/...` (see `src/lib/course-assets.ts`),
      // while an exercise's assets are already fully resolved earlier, in
      // `resolveSharedTestForPlayer`.
      courseId,
      courseTitle: selectedNode?.title || "Document",
      exitPlayer: closePreview,
      isPreview: true,
      isSectionIntro: false,
      // Closing on "Continue" too, same simplification the test preview
      // makes for its own single-item preview — chaining into a live
      // preview of the lesson's attached test would need that test
      // editor's own in-memory state, which this page doesn't have.
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
    // target of the editor's own "Preview document" click, which always
    // supplies `location.state`. A direct navigation or a reload lands here
    // instead.
    return <Navigate replace to={`/drafts/${courseId}`} />;
  }

  return (
    <CoursePlayerPageLayout playerKey="preview-lesson">
      <LessonPlayerView playerState={previewPlayerState} />
    </CoursePlayerPageLayout>
  );
}
