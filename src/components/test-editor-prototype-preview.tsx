import { useMemo } from "react";

import { CoursePlayerPageLayout } from "@/components/course-player-page-layout";
import type { CoursePlayerReadyState } from "@/components/course-player/use-course-player";
import { toSharedTestDefinition } from "@/components/test-editor-prototype-persistence";
import type { TestEditorState } from "@/components/test-editor-prototype-types";
import { TestPlayerView } from "@/components/test-player/test-player";
import { resolveSharedTestForPlayer } from "@/lib/exercise-kinds/registry";
import type { Locale } from "@/lib/i18n";

/**
 * Runs the draft test through the exact same page a student sees
 * (`TestPlayerView`, the shared half of `TestPlayer`), without writing
 * anything to disk or cutting a version — see "Previewing a draft test" in
 * docs/persistence-notes.md.
 */
export function TestPreviewPlayer({
  onClose,
  open,
  supportedLocales,
  testState,
}: {
  onClose: () => void;
  open: boolean;
  supportedLocales: Locale[];
  testState: TestEditorState;
}) {
  const previewPlayerState: CoursePlayerReadyState | undefined = useMemo(() => {
    if (!open) {
      return undefined;
    }

    const requestedLocales = [testState.selectedLocale, ...supportedLocales].filter(
      (locale, index, locales) => locales.indexOf(locale) === index,
    );
    const sharedTest = toSharedTestDefinition(testState);
    const test = resolveSharedTestForPlayer(sharedTest, requestedLocales, "preview");

    return {
      activeStep: {
        item: {
          body: "",
          description: "",
          iconUrl: null,
          id: "preview",
          test,
          title: testState.title || "Test",
        },
        kind: "lesson",
      },
      courseId: "preview",
      courseTitle: testState.title || "Test",
      exitPlayer: onClose,
      moveToNextStep: onClose,
      progressCurrent: 1,
      progressTotal: 1,
      sectionTitle: "Preview",
      status: "ready",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `supportedLocales.join` keys on content, not the array's (possibly re-created every render) identity
  }, [onClose, open, supportedLocales.join(","), testState]);

  if (!previewPlayerState) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <CoursePlayerPageLayout playerKey="preview-test">
        <TestPlayerView playerState={previewPlayerState} />
      </CoursePlayerPageLayout>
    </div>
  );
}
