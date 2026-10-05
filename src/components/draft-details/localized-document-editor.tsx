import { useCallback, useEffect, useMemo, useRef } from "react";
import { filterSuggestionItems } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";

import type { LocalizedDocumentDraft } from "@/components/draft-details/use-localized-document-draft";
import { documentEditorSchema } from "@/components/editor-prototype/blocknote-schema";
import {
  blockNoteBlocksToEditorPrototype,
  editorPrototypeBlocksToBlockNote,
} from "@/components/editor-prototype/blocknote-translation";
import { DocumentEditorContextProvider } from "@/components/editor-prototype/document-editor-context";
import type { EditorPrototypeBlock } from "@/components/editor-prototype/editor-prototype-types";
import { createExerciseSlashMenuItem } from "@/components/editor-prototype/exercise-block";
import { mnemonicDecorationsExtension, refreshMnemonicDecorations } from "@/components/editor-prototype/mnemonic-decorations";
import { LocalesTabs } from "@/components/locales-tabs";
import type { CourseAssetKind } from "@/lib/course-asset-id";
import { matkoAssetUrl } from "@/lib/course-assets";
import { useCourseDetailsQuery, useUploadCourseAssetBytesMutation } from "@/lib/course-queries";
import type { Locale } from "@/lib/i18n";
import { parseMnemonics } from "@/lib/mnemonics";
import { useAppState } from "@/lib/use-app-state";

// A document written per language in BlockNote: a lesson body or a section
// intro (SLJ-45). `useLocalizedDocumentDraft` (its own file) holds every
// language's blocks; `LocalizedDocumentEditor` shows the language tabs and the
// editor. Saving is the caller's: each document type has its own IPC call.

// BlockNote's own "Upload from device" file input already restricts the OS
// picker to each block's accepted mime types (image/video/audio), so this
// only needs to pick between our three non-SVG asset kinds.
function assetKindForFile(file: File): CourseAssetKind {
  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "image";
}

function DocumentBlockNoteEditor({
  activeLocale,
  autoFocusOnMount,
  blocks,
  courseId,
  onChange,
}: {
  activeLocale: Locale;
  autoFocusOnMount: boolean;
  blocks: EditorPrototypeBlock[];
  courseId: string;
  onChange: (blocks: EditorPrototypeBlock[]) => void;
}) {
  const { locale, theme } = useAppState();
  const hasAutoFocusedRef = useRef(false);
  // `mutateAsync` itself is stable across renders — depending on the whole
  // mutation object here instead would recreate `uploadFile` (and, via
  // `useCreateBlockNote`, silently go stale) on every unrelated re-render.
  const { mutateAsync: uploadAssetBytes } = useUploadCourseAssetBytesMutation();
  const uploadFile = useCallback(
    async (file: File) => {
      const data = await file.arrayBuffer();
      const result = await uploadAssetBytes({
        courseId,
        data,
        filename: file.name,
        kind: assetKindForFile(file),
      });

      return matkoAssetUrl(courseId, result.path);
    },
    [courseId, uploadAssetBytes],
  );
  // Recreated (not just re-rendered) whenever the active locale changes —
  // each locale's content is a fully separate BlockNote document, so a new
  // `activeLocale` needs a fresh editor instance seeded from that locale's
  // own blocks, same as `initialContent` would otherwise only apply once.
  // The course's mnemonics for this language, marked in the text while
  // writing (SLJ-37); read through a ref so an edit to the list doesn't
  // recreate the editor.
  const { data: course } = useCourseDetailsQuery(courseId, locale);
  const mnemonics = useMemo(
    () => parseMnemonics(course?.locales[activeLocale]?.mnemonics),
    [activeLocale, course],
  );
  const mnemonicsRef = useRef(mnemonics);
  mnemonicsRef.current = mnemonics;
  const editor = useCreateBlockNote(
    {
      extensions: [mnemonicDecorationsExtension(() => mnemonicsRef.current)],
      initialContent: editorPrototypeBlocksToBlockNote(blocks, courseId),
      schema: documentEditorSchema,
      uploadFile,
    },
    [activeLocale],
  );

  useEffect(() => {
    refreshMnemonicDecorations(editor);
  }, [editor, mnemonics]);

  useEffect(() => {
    if (autoFocusOnMount && !hasAutoFocusedRef.current) {
      editor.focus();
      hasAutoFocusedRef.current = true;
    }
  }, [autoFocusOnMount, editor]);

  return (
    <BlockNoteView
      editable
      editor={editor}
      formattingToolbar={false}
      onChange={() => onChange(blockNoteBlocksToEditorPrototype(editor.document))}
      slashMenu={false}
      theme={theme}
    >
      {/* BlockNote's toolbar without its Download button for a selected
          image/video/audio: the media player has its own download. */}
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar>
            {getFormattingToolbarItems().filter((item) => item.key !== "fileDownloadButton")}
          </FormattingToolbar>
        )}
      />
      <SuggestionMenuController
        getItems={async (query) =>
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), createExerciseSlashMenuItem(editor)],
            query,
          )
        }
        triggerCharacter="/"
      />
    </BlockNoteView>
  );
}

export function LocalizedDocumentEditor({
  courseId,
  document,
  supportedLocales,
}: {
  courseId: string;
  document: LocalizedDocumentDraft;
  supportedLocales: Locale[];
}) {
  return (
    <>
      {supportedLocales.length > 1 && (
        <LocalesTabs
          activeLocale={document.activeLocale}
          locales={supportedLocales}
          onActiveLocaleChange={document.setActiveLocale}
          renderContent={() => null}
        />
      )}
      <DocumentEditorContextProvider courseId={courseId} supportedLocales={supportedLocales}>
        <DocumentBlockNoteEditor
          activeLocale={document.activeLocale}
          autoFocusOnMount={document.isNewDocument}
          blocks={document.activeBlocks}
          courseId={courseId}
          onChange={document.setActiveBlocks}
        />
      </DocumentEditorContextProvider>
    </>
  );
}
