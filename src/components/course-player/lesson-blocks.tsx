import { useMemo, useState } from "react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import { documentEditorSchema } from "@/components/editor-prototype/blocknote-schema";
import { DocumentEditorContextProvider } from "@/components/editor-prototype/document-editor-context";
import { editorPrototypeBlocksToBlockNote } from "@/components/editor-prototype/blocknote-translation";
import { UnsupportedContentNotice } from "@/components/course-player/unsupported-content-notice";
import { hasUnknownBlocks, markdownToBlocks } from "@/lib/lesson-content-markdown";
import { useAppState } from "@/lib/use-app-state";

/**
 * The student-facing counterpart to the draft document editor
 * (`draft-details/draft-document-editor.tsx`) — the same BlockNote view, in
 * read-only mode, so a lesson looks and behaves identically for the
 * teacher and the student. The inline exercise block is the one part that
 * stays fully interactive even here: it renders its own live "answer it and
 * check" UI when `editor.isEditable` is false (see `exercise-block.tsx`).
 */
export function LessonBlocks({ courseId, source }: { courseId: string; source: string }) {
  const { theme } = useAppState();
  const blocks = useMemo(() => markdownToBlocks(source), [source]);
  // The source the notice was dismissed for, so it shows again on the next
  // lesson without needing a remount.
  const [dismissedForSource, setDismissedForSource] = useState<string | null>(null);
  const showUnsupportedNotice = hasUnknownBlocks(blocks) && dismissedForSource !== source;
  // Recreated whenever the lesson's own content changes (source or the
  // course it belongs to) — this component isn't necessarily remounted when
  // the student navigates to a different lesson, so `initialContent` (only
  // read once by `useCreateBlockNote`) needs deps to stay in sync.
  const editor = useCreateBlockNote(
    {
      initialContent: editorPrototypeBlocksToBlockNote(blocks, courseId),
      schema: documentEditorSchema,
    },
    [courseId, source],
  );

  return (
    <div className="flex flex-col gap-4">
      {showUnsupportedNotice && (
        <UnsupportedContentNotice onDismiss={() => setDismissedForSource(source)} />
      )}
      <div className="typeset typeset-course">
        <DocumentEditorContextProvider courseId={courseId} supportedLocales={[]}>
          {/* No formatting toolbar: in read-only mode BlockNote shows one above a
              selected file block whose only actions are Download and a preview
              toggle. The video player has its own download in its ⋮ menu. */}
          <BlockNoteView editable={false} editor={editor} formattingToolbar={false} theme={theme} />
        </DocumentEditorContextProvider>
      </div>
    </div>
  );
}
