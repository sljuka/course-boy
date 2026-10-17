import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
import { LessonLinkButton } from "@/components/editor-prototype/lesson-link-button";
import { LessonLinkDialog, type PickedLessonLink } from "@/components/editor-prototype/lesson-link-dialog";
import { createLessonLinkSlashMenuItem } from "@/components/editor-prototype/lesson-link-slash-item";
import { mnemonicDecorationsExtension, refreshMnemonicDecorations } from "@/components/editor-prototype/mnemonic-decorations";
import { LocalesTabs } from "@/components/locales-tabs";
import type { CourseAssetKind } from "@/lib/course-asset-id";
import { matkoAssetUrl } from "@/lib/course-assets";
import { useCourseDetailsQuery, useUploadCourseAssetBytesMutation } from "@/lib/course-queries";
import type { Locale } from "@/lib/i18n";
import { parseMnemonics } from "@/lib/mnemonics";
import { useAppState } from "@/lib/use-app-state";
import { blockNoteLinkOptions } from "@/components/editor-prototype/blocknote-links";

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
  const { t } = useTranslation();
  const { locale, theme } = useAppState();
  const hasAutoFocusedRef = useRef(false);
  // "Link to a lesson" (SLJ-60): from the `/` menu it writes the lesson's
  // title as a link at the cursor ("insert"); from the formatting toolbar it
  // links the selected text ("selection"). Null: the picker is closed.
  const [lessonLinkMode, setLessonLinkMode] = useState<"insert" | "selection" | null>(null);
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
      links: blockNoteLinkOptions,
      schema: documentEditorSchema,
      uploadFile,
    },
    [activeLocale],
  );

  useEffect(() => {
    refreshMnemonicDecorations(editor);
  }, [editor, mnemonics]);

  // The editor keeps its selection while the picker has focus.
  function insertLessonLink({ href, title }: PickedLessonLink) {
    const mode = lessonLinkMode;
    setLessonLinkMode(null);
    editor.focus();
    editor.createLink(href, mode === "insert" ? title : undefined);
  }

  useEffect(() => {
    if (autoFocusOnMount && !hasAutoFocusedRef.current) {
      editor.focus();
      hasAutoFocusedRef.current = true;
    }
  }, [autoFocusOnMount, editor]);

  return (
    <>
      <BlockNoteView
        editable
        editor={editor}
        formattingToolbar={false}
        onChange={() => onChange(blockNoteBlocksToEditorPrototype(editor.document))}
        slashMenu={false}
        theme={theme}
      >
        {/* BlockNote's toolbar without its Download button for a selected
            image/video/audio (the media player has its own download), and
            with "Link to a lesson" after its link button. */}
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              {getFormattingToolbarItems().flatMap((item) => {
                if (item.key === "fileDownloadButton") return [];
                if (item.key !== "createLinkButton") return [item];
                return [
                  item,
                  <LessonLinkButton key="lessonLinkButton" onClick={() => setLessonLinkMode("selection")} />,
                ];
              })}
            </FormattingToolbar>
          )}
        />
        <SuggestionMenuController
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getDefaultReactSlashMenuItems(editor),
                createExerciseSlashMenuItem(editor),
                createLessonLinkSlashMenuItem({
                  onClick: () => setLessonLinkMode("insert"),
                  subtext: t("lessonLink.slashSubtext"),
                  title: t("lessonLink.title"),
                }),
              ],
              query,
            )
          }
          triggerCharacter="/"
        />
      </BlockNoteView>
      {/* Beside the editor, not in it: React events bubble through portals to
          their React parents, so typing here would reach the editor. */}
      <LessonLinkDialog
        courseId={courseId}
        locale={activeLocale}
        onOpenChange={(open) => {
          if (open) return;
          setLessonLinkMode(null);
          editor.focus();
        }}
        onPick={insertLessonLink}
        open={lessonLinkMode !== null}
      />
    </>
  );
}

export function LocalizedDocumentEditor({
  courseId,
  document,
  header,
  showLocaleTabs = true,
  supportedLocales,
}: {
  courseId: string;
  document: LocalizedDocumentDraft;
  // False when the page's own language tabs already pick the language.
  showLocaleTabs?: boolean;
  // Above the text, below the language tabs: a document's title field for
  // the language being edited.
  header?: ReactNode;
  supportedLocales: Locale[];
}) {
  return (
    <>
      {showLocaleTabs && supportedLocales.length > 1 && (
        <LocalesTabs
          activeLocale={document.activeLocale}
          locales={supportedLocales}
          onActiveLocaleChange={document.setActiveLocale}
          renderContent={() => null}
        />
      )}
      {header}
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
