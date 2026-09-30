import { useCallback, useEffect, useRef, useState } from "react";
import { filterSuggestionItems } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
import { Button, ButtonLabel } from "@/components/ui/button";
import type { CourseAssetKind } from "@/lib/course-asset-id";
import { matkoAssetUrl } from "@/lib/course-assets";
import type { CourseLesson, UpdateLessonContentInput } from "@/lib/course-package";
import { buildDraftLessonPreviewPath } from "@/lib/course-utils";
import type { Locale } from "@/lib/i18n";
import { blocksToMarkdown } from "@/lib/lesson-content-markdown";
import {
  useCourseDetailsForLocalesQueries,
  useUpdateLessonContentMutation,
  useUploadCourseAssetBytesMutation,
} from "@/lib/course-queries";
import {
  buildDocumentSeed,
  type DocumentLocaleDraft,
} from "@/components/draft-details/draft-document-seed";
import { useEntityAutosave, useForwardAutosaveStatus } from "@/lib/use-entity-autosave";
import { useAppState } from "@/lib/use-app-state";

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
  const { theme } = useAppState();
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
  const editor = useCreateBlockNote(
    {
      initialContent: editorPrototypeBlocksToBlockNote(blocks, courseId),
      schema: documentEditorSchema,
      uploadFile,
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
      theme={theme}
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

type DraftDocumentEditorProps = {
  appLocale: Locale;
  courseId: string;
  lesson: CourseLesson;
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  sectionId: string;
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
};

// Loads this lesson's saved body in *every* supported language before the
// editor mounts. `lesson.body` alone is only the app's current language;
// seeding other language tabs from a blank template instead let the first
// keystroke there autosave the template over that language's real content.
export function DraftDocumentEditor(props: DraftDocumentEditorProps) {
  const { courseId, sectionId, selectedNode, supportedLocales } = props;
  const detailsQueries = useCourseDetailsForLocalesQueries(courseId, supportedLocales);

  // `isPending` (no data yet), not `isFetching`: the refetch after every
  // autosave must not unmount the editor mid-edit.
  if (detailsQueries.some((query) => query.isPending)) {
    return <PageContent>{null}</PageContent>;
  }

  const lessonBodies = Object.fromEntries(
    supportedLocales.map((locale, index) => {
      const section = detailsQueries[index]?.data?.sections.find(
        (candidate) => candidate.id === sectionId,
      );
      const lesson = section?.lessons.find((candidate) => candidate.id === selectedNode.id);

      return [locale, lesson?.body ?? ""];
    }),
  ) as Partial<Record<Locale, string>>;

  return <LoadedDraftDocumentEditor {...props} lessonBodies={lessonBodies} />;
}

function LoadedDraftDocumentEditor({
  appLocale,
  courseId,
  lesson,
  lessonBodies,
  reportAutosaveStatus,
  sectionId,
  selectedNode,
  supportedLocales,
}: DraftDocumentEditorProps & { lessonBodies: Partial<Record<Locale, string>> }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [initialLocale] = useState<Locale>(() =>
    supportedLocales.includes(appLocale) ? appLocale : (supportedLocales[0] ?? appLocale),
  );
  // Frozen at mount: the editor's starting content per language, and the
  // autosave baseline — so an untouched language tab is never written.
  const [seed] = useState<DocumentLocaleDraft>(() =>
    buildDocumentSeed(lessonBodies, supportedLocales),
  );
  const [draft, setDraft] = useState<DocumentLocaleDraft>(seed);
  // Frozen at mount, same as `seed` above — a document that starts blank
  // gets its heading autofocused; one that already has real content never
  // does, even after the draft itself changes.
  const [isNewDocument] = useState(
    () => (lessonBodies[initialLocale] ?? "").trim().length === 0,
  );
  const [activeDocumentLocale, setActiveDocumentLocale] = useState<Locale>(initialLocale);
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

  function openPreview() {
    navigate(buildDraftLessonPreviewPath(courseId), {
      state: {
        body: blocksToMarkdown(activeBlocks),
        selectedNode,
        test: lesson.test,
      },
    });
  }

  return (
    <PageContent
      actions={
        <Button
          onClick={openPreview}
          size="sm"
          title={t("courseDetails.previewDocument")}
          variant="secondary"
        >
          <Play aria-hidden="true" />
          <ButtonLabel>{t("courseDetails.previewDocument")}</ButtonLabel>
        </Button>
      }
      fullBleed
    >
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
