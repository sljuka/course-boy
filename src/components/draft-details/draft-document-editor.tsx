import { useCallback, useEffect, useRef, useState } from "react";
import { filterSuggestionItems } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";

import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { CourseLayoutOutletContext } from "@/components/course-layout";
import { documentEditorSchema } from "@/components/editor-prototype/blocknote-schema";
import { DocumentEditorContextProvider } from "@/components/editor-prototype/document-editor-context";
import { createExerciseSlashMenuItem } from "@/components/editor-prototype/exercise-block";
import {
  createInitialDocumentBlocks,
  type EditorPrototypeBlock,
} from "@/components/editor-prototype/editor-prototype-types";
import {
  blockNoteBlocksToEditorPrototype,
  editorPrototypeBlocksToBlockNote,
} from "@/components/editor-prototype/blocknote-translation";
import { LocalesTabs } from "@/components/locales-tabs";
import { PageContent } from "@/components/page-content";
import type { CourseLesson, UpdateLessonContentInput } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { blocksToMarkdown, markdownToBlocks } from "@/lib/lesson-content-markdown";
import { useUpdateLessonContentMutation } from "@/lib/course-queries";
import { useEntityAutosave, useForwardAutosaveStatus } from "@/lib/use-entity-autosave";

type DocumentLocaleDraft = Partial<Record<Locale, EditorPrototypeBlock[]>>;

function buildDocumentSeed(
  lessonBody: string | undefined,
  appLocale: Locale,
): DocumentLocaleDraft {
  const hasRealContent = Boolean(lessonBody && lessonBody.trim().length > 0);

  return {
    [appLocale]: hasRealContent
      ? markdownToBlocks(lessonBody!)
      : createInitialDocumentBlocks(undefined, appLocale),
  };
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
  const hasAutoFocusedRef = useRef(false);
  // Recreated (not just re-rendered) whenever the active locale changes —
  // each locale's content is a fully separate BlockNote document, so a new
  // `activeLocale` needs a fresh editor instance seeded from that locale's
  // own blocks, same as `initialContent` would otherwise only apply once.
  const editor = useCreateBlockNote(
    {
      initialContent: editorPrototypeBlocksToBlockNote(blocks, courseId),
      schema: documentEditorSchema,
    },
    [activeLocale],
  );

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
      onChange={() => onChange(blockNoteBlocksToEditorPrototype(editor.document))}
      slashMenu={false}
    >
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

export function DraftDocumentEditor({
  appLocale,
  courseId,
  lesson,
  reportAutosaveStatus,
  sectionId,
  selectedNode,
  supportedLocales,
}: {
  appLocale: Locale;
  courseId: string;
  lesson: CourseLesson;
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  sectionId: string;
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
}) {
  const [seed] = useState<DocumentLocaleDraft>(() => buildDocumentSeed(lesson.body, appLocale));
  const [draft, setDraft] = useState<DocumentLocaleDraft>(seed);
  // Frozen at mount, same as `seed` above — a document that starts blank
  // gets its heading autofocused; one that already has real content never
  // does, even after the draft itself changes.
  const [isNewDocument] = useState(() => !lesson.body || lesson.body.trim().length === 0);
  const [activeDocumentLocale, setActiveDocumentLocale] = useState<Locale>(appLocale);
  const updateLessonContentMutation = useUpdateLessonContentMutation();

  useEffect(() => {
    if (supportedLocales.includes(activeDocumentLocale)) {
      return;
    }

    setActiveDocumentLocale(supportedLocales[0] ?? appLocale);
  }, [activeDocumentLocale, appLocale, supportedLocales]);

  const buildInput = useCallback(
    (value: DocumentLocaleDraft): UpdateLessonContentInput => ({
      courseId,
      lessonId: selectedNode.id,
      locales: Object.fromEntries(
        Object.entries(value).map(([locale, blocks]) => [
          locale,
          { body: blocksToMarkdown(blocks!) },
        ]),
      ),
      sectionId,
    }),
    [courseId, sectionId, selectedNode.id],
  );

  const autosave = useEntityAutosave({
    buildInput,
    initialValue: seed,
    mutation: updateLessonContentMutation,
    value: draft,
  });

  useForwardAutosaveStatus(reportAutosaveStatus, autosave);

  const activeBlocks =
    draft[activeDocumentLocale] ?? createInitialDocumentBlocks(undefined, activeDocumentLocale);

  return (
    <PageContent fullBleed>
      {supportedLocales.length > 1 && (
        <LocalesTabs
          activeLocale={activeDocumentLocale}
          locales={supportedLocales}
          onActiveLocaleChange={setActiveDocumentLocale}
          renderContent={() => null}
        />
      )}
      <DocumentEditorContextProvider courseId={courseId} supportedLocales={supportedLocales}>
        <DocumentBlockNoteEditor
          activeLocale={activeDocumentLocale}
          autoFocusOnMount={isNewDocument}
          blocks={activeBlocks}
          courseId={courseId}
          onChange={(blocks) =>
            setDraft((current) => ({ ...current, [activeDocumentLocale]: blocks }))
          }
        />
      </DocumentEditorContextProvider>
    </PageContent>
  );
}
