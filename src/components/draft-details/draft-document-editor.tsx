import { useCallback, useEffect, useState } from "react";

import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { CourseLayoutOutletContext } from "@/components/course-layout";
import { EditorPrototype } from "@/components/editor-prototype/editor-prototype";
import {
  createInitialDocumentBlocks,
  type EditorPrototypeBlock,
} from "@/components/editor-prototype/editor-prototype-types";
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
      <EditorPrototype
        activeLocale={activeDocumentLocale}
        autoFocusInitialHeading={isNewDocument}
        blocks={activeBlocks}
        courseId={courseId}
        nodeType={selectedNode.type}
        onActiveLocaleChange={setActiveDocumentLocale}
        onBlocksChange={(blocks) =>
          setDraft((current) => ({ ...current, [activeDocumentLocale]: blocks }))
        }
        supportedLocales={supportedLocales}
      />
    </PageContent>
  );
}
