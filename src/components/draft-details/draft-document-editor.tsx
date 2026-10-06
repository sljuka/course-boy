import { useCallback } from "react";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { CourseLayoutOutletContext } from "@/components/course-layout";
import type { DocumentLocaleDraft } from "@/components/draft-details/draft-document-seed";
import { LocalizedDocumentEditor } from "@/components/draft-details/localized-document-editor";
import { useLocalizedDocumentDraft } from "@/components/draft-details/use-localized-document-draft";
import { PageContent } from "@/components/page-content";
import { Button, ButtonLabel } from "@/components/ui/button";
import type {
  CourseLesson,
  UpdateLessonContentInput,
} from "@/lib/course-package";
import { buildDraftLessonPreviewPath } from "@/lib/course-utils";
import type { Locale } from "@/lib/i18n";
import { blocksToMarkdown } from "@/lib/lesson-content-markdown";
import {
  useCourseDetailsForLocalesQueries,
  useUpdateLessonContentMutation,
} from "@/lib/course-queries";
import {
  useEntityAutosave,
  useForwardAutosaveStatus,
} from "@/lib/use-entity-autosave";

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
  const detailsQueries = useCourseDetailsForLocalesQueries(
    courseId,
    supportedLocales,
  );

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
      const lesson = section?.lessons.find(
        (candidate) => candidate.id === selectedNode.id,
      );

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
}: DraftDocumentEditorProps & {
  lessonBodies: Partial<Record<Locale, string>>;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const document = useLocalizedDocumentDraft({
    appLocale,
    bodies: lessonBodies,
    supportedLocales,
  });
  const updateLessonContentMutation = useUpdateLessonContentMutation();

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
    initialValue: document.seed,
    mutation: updateLessonContentMutation,
    value: document.draft,
  });

  useForwardAutosaveStatus(reportAutosaveStatus, autosave);

  function openPreview() {
    navigate(buildDraftLessonPreviewPath(courseId), {
      state: {
        body: blocksToMarkdown(document.activeBlocks),
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
      <LocalizedDocumentEditor
        courseId={courseId}
        document={document}
        supportedLocales={supportedLocales}
      />
    </PageContent>
  );
}
