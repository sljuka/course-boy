import { useCallback, useMemo, useState } from "react";
import { Maximize2, Minimize2, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { CourseLayoutOutletContext } from "@/components/course-layout";
import type { DocumentLocaleDraft } from "@/components/draft-details/draft-document-seed";
import { LocalizedDocumentEditor } from "@/components/draft-details/localized-document-editor";
import { useLocalizedDocumentDraft } from "@/components/draft-details/use-localized-document-draft";
import { PageContent } from "@/components/page-content";
import { Button, ButtonLabel } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IMMERSIVE_SHORTCUT_LABEL, useImmersiveMode, useImmersiveModeShortcut } from "@/lib/use-immersive-mode";
import { useFocusTitleOnRename } from "@/components/draft-details/use-focus-title-on-rename";
import type {
  CourseLesson,
  UpdateCourseLessonMetadataInput,
  UpdateLessonContentInput,
} from "@/lib/course-package";
import { buildDraftLessonPreviewPath } from "@/lib/course-utils";
import type { Locale } from "@/lib/i18n";
import { blocksToMarkdown } from "@/lib/lesson-content-markdown";
import {
  useCourseDetailsForLocalesQueries,
  useUpdateLessonContentMutation,
  useUpdateLessonMetadataMutation,
} from "@/lib/course-queries";
import {
  mergeAutosaveStatuses,
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

  const lessonsByLocale = supportedLocales.map((locale, index) => {
    const section = detailsQueries[index]?.data?.sections.find(
      (candidate) => candidate.id === sectionId,
    );
    return [locale, section?.lessons.find((candidate) => candidate.id === selectedNode.id)] as const;
  });
  const lessonBodies = Object.fromEntries(
    lessonsByLocale.map(([locale, lesson]) => [locale, lesson?.body ?? ""]),
  ) as Partial<Record<Locale, string>>;
  // Its title in every language as written, for the title field (and so
  // renaming): never the default language's standing in for a missing one,
  // which a save would then write into that language.
  const writtenTitles = lessonsByLocale.find(([, lesson]) => lesson?.locales)?.[1]?.locales;
  const lessonTitles = Object.fromEntries(
    supportedLocales.map((locale) => [locale, writtenTitles?.[locale]?.title ?? ""]),
  ) as Partial<Record<Locale, string>>;

  return <LoadedDraftDocumentEditor {...props} lessonBodies={lessonBodies} lessonTitles={lessonTitles} />;
}

function LoadedDraftDocumentEditor({
  appLocale,
  courseId,
  lesson,
  lessonBodies,
  lessonTitles,
  reportAutosaveStatus,
  sectionId,
  selectedNode,
  supportedLocales,
}: DraftDocumentEditorProps & {
  lessonBodies: Partial<Record<Locale, string>>;
  lessonTitles: Partial<Record<Locale, string>>;
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

  // The title per language: its own save (it's in the lesson's file, the
  // body in its own); the page shows one status for both.
  const [titleSeed] = useState(lessonTitles);
  const [titles, setTitles] = useState(titleSeed);
  const updateLessonMetadataMutation = useUpdateLessonMetadataMutation();
  const buildTitleInput = useCallback(
    (value: Partial<Record<Locale, string>>): UpdateCourseLessonMetadataInput => ({
      courseId,
      lessonId: selectedNode.id,
      locales: Object.fromEntries(Object.entries(value).map(([locale, title]) => [locale, { title: title ?? "" }])),
      sectionId,
    }),
    [courseId, sectionId, selectedNode.id],
  );
  const titleAutosave = useEntityAutosave({
    buildInput: buildTitleInput,
    initialValue: titleSeed,
    mutation: updateLessonMetadataMutation,
    value: titles,
  });
  useFocusTitleOnRename(selectedNode.renameRequest, "draft-document-title-");

  const { saveNow: saveBodyNow } = autosave;
  const { saveNow: saveTitleNow } = titleAutosave;
  const saveNow = useCallback(() => {
    saveBodyNow();
    saveTitleNow();
  }, [saveBodyNow, saveTitleNow]);
  const pageAutosave = useMemo(
    () => ({
      errorMessage: autosave.errorMessage ?? titleAutosave.errorMessage,
      saveNow,
      status: mergeAutosaveStatuses([autosave.status, titleAutosave.status]),
    }),
    [autosave.errorMessage, autosave.status, saveNow, titleAutosave.errorMessage, titleAutosave.status],
  );

  useForwardAutosaveStatus(reportAutosaveStatus, pageAutosave);
  const activeTitle = titles[document.activeLocale] ?? "";

  // Full screen for writing (lib/immersive-mode.tsx): the button, ⌘⇧F /
  // Ctrl+Shift+F, and leaving it whenever this editor closes.
  const immersive = useImmersiveMode();
  useImmersiveModeShortcut();

  function openPreview() {
    navigate(buildDraftLessonPreviewPath(courseId), {
      state: {
        body: blocksToMarkdown(document.activeBlocks),
        locale: document.activeLocale,
        selectedNode,
        test: lesson.test,
      },
    });
  }

  return (
    <PageContent
      actions={
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={t("draftDocument.fullScreen")}
                  data-testid="document-full-screen"
                  onClick={immersive.enter}
                  shape="circle"
                  size="icon-sm"
                  variant="secondary"
                />
              }
            >
              <Maximize2 aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>
              {t("draftDocument.fullScreen")} ({IMMERSIVE_SHORTCUT_LABEL})
            </TooltipContent>
          </Tooltip>
          <Button
            onClick={openPreview}
            size="sm"
            title={t("courseDetails.previewDocument")}
            variant="secondary"
          >
            <Play aria-hidden="true" />
            <ButtonLabel>{t("courseDetails.previewDocument")}</ButtonLabel>
          </Button>
        </>
      }
      fullBleed
    >
      <LocalizedDocumentEditor
        courseId={courseId}
        document={document}
        header={
          // Full screen is for the text only: the title stays in the normal view.
          !immersive.isImmersive && (
            <Field>
              <FieldLabel htmlFor={`draft-document-title-${document.activeLocale}`}>
                {t("draftDocument.title")}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </FieldLabel>
              <Input
                aria-invalid={activeTitle.trim().length === 0}
                id={`draft-document-title-${document.activeLocale}`}
                onChange={(event) =>
                  setTitles((current) => ({ ...current, [document.activeLocale]: event.target.value }))
                }
                placeholder={t("draftDocument.titlePlaceholder")}
                value={activeTitle}
              />
            </Field>
          )
        }
        supportedLocales={supportedLocales}
      />
      {immersive.isImmersive && (
        <div className="fixed top-3 right-3 z-50">
          <Button data-testid="exit-full-screen" onClick={immersive.exit} size="sm" variant="ghost">
            <Minimize2 aria-hidden="true" />
            {t("draftDocument.exitFullScreen")}
          </Button>
        </div>
      )}
    </PageContent>
  );
}
