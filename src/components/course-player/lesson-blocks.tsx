import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import { documentEditorSchema } from "@/components/editor-prototype/blocknote-schema";
import { DocumentEditorContextProvider } from "@/components/editor-prototype/document-editor-context";
import { editorPrototypeBlocksToBlockNote } from "@/components/editor-prototype/blocknote-translation";
import { markdownToBlocks } from "@/lib/lesson-content-markdown";

/**
 * The student-facing counterpart to the draft document editor
 * (`draft-details/draft-document-editor.tsx`) — the same BlockNote view, in
 * read-only mode, so a lesson looks and behaves identically for the
 * teacher and the student. The inline exercise block is the one part that
 * stays fully interactive even here: it renders its own live "answer it and
 * check" UI when `editor.isEditable` is false (see `exercise-block.tsx`).
 */
export function LessonBlocks({ courseId, source }: { courseId: string; source: string }) {
  // Recreated whenever the lesson's own content changes (source or the
  // course it belongs to) — this component isn't necessarily remounted when
  // the student navigates to a different lesson, so `initialContent` (only
  // read once by `useCreateBlockNote`) needs deps to stay in sync.
  const editor = useCreateBlockNote(
    {
      initialContent: editorPrototypeBlocksToBlockNote(markdownToBlocks(source), courseId),
      schema: documentEditorSchema,
    },
    [courseId, source],
  );

  return (
    <div className="typeset typeset-course">
      <DocumentEditorContextProvider courseId={courseId} supportedLocales={[]}>
        <BlockNoteView editable={false} editor={editor} />
      </DocumentEditorContextProvider>
    </div>
  );
}
