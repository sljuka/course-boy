import { FileText, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { DocumentLocaleDraft } from "@/components/draft-details/draft-document-seed";
import { LocalizedDocumentEditor } from "@/components/draft-details/localized-document-editor";
import { useLocalizedDocumentDraft } from "@/components/draft-details/use-localized-document-draft";
import { createInitialDocumentBlocks } from "@/components/editor-prototype/editor-prototype-types";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import type { CourseSectionPreview, UpdateSectionIntroInput } from "@/lib/course-package";
import {
  useCourseDetailsForLocalesQueries,
  useRemoveSectionIntroMutation,
  useUpdateSectionIntroMutation,
} from "@/lib/course-queries";
import type { Locale } from "@/lib/i18n";
import { blocksToMarkdown } from "@/lib/lesson-content-markdown";
import { useAppState } from "@/lib/use-app-state";
import { type EntityAutosaveStatus, useEntityAutosave } from "@/lib/use-entity-autosave";

export type SectionIntroAutosave = {
  errorMessage: string | null;
  saveNow: () => void;
  status: EntityAutosaveStatus;
};

// The section intro (SLJ-45) on the section page: "Add section intro" when
// there is none, otherwise the intro document (the lesson editor, per
// language) and "Remove intro", which asks first. Students see the intro first
// when they start the section. Its autosave status is reported to the section
// page (`onAutosaveChange`), which merges it with the section's own fields.
export function SectionIntroArea({
  courseId,
  onAutosaveChange,
  section,
  sectionTitles,
  supportedLocales,
}: {
  courseId: string;
  onAutosaveChange: (autosave: SectionIntroAutosave | null) => void;
  section: CourseSectionPreview;
  // The section's current title per language: the new intro's heading.
  sectionTitles: Partial<Record<Locale, string>>;
  supportedLocales: Locale[];
}) {
  const { t } = useTranslation();
  const detailsQueries = useCourseDetailsForLocalesQueries(courseId, supportedLocales);
  const updateMutation = useUpdateSectionIntroMutation();
  const removeMutation = useRemoveSectionIntroMutation();
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  // `isPending` (no data yet), not `isFetching`: the refetch after every
  // autosave must not unmount the editor mid-edit.
  if (detailsQueries.some((query) => query.isPending)) {
    return null;
  }

  const introBodies = Object.fromEntries(
    supportedLocales.map((locale, index) => [
      locale,
      detailsQueries[index]?.data?.sections.find((candidate) => candidate.id === section.id)?.intro ?? null,
    ]),
  ) as Partial<Record<Locale, string | null>>;
  const hasIntro = Object.values(introBodies).some((body) => body !== null);

  function addIntro() {
    updateMutation.mutate({
      courseId,
      locales: Object.fromEntries(
        supportedLocales.map((locale) => [
          locale,
          { body: blocksToMarkdown(createInitialDocumentBlocks(sectionTitles[locale] || section.title, locale)) },
        ]),
      ),
      sectionId: section.id,
    });
  }

  if (!hasIntro) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button
          data-testid="add-section-intro"
          disabled={updateMutation.isPending}
          onClick={addIntro}
          size="sm"
          variant="secondary"
        >
          <FileText aria-hidden="true" />
          {t("draftSection.addIntro")}
        </Button>
        <CardDescription>{t("draftSection.introHint")}</CardDescription>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>{t("draftSection.introLabel")}</FieldLabel>
        <Button
          data-testid="remove-section-intro"
          onClick={() => setIsConfirmingRemove(true)}
          size="sm"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" />
          {t("draftSection.removeIntro")}
        </Button>
      </div>
      <SectionIntroDocument
        // Remounted when the intro is (re)created, so its editor seeds afresh.
        bodies={Object.fromEntries(
          Object.entries(introBodies).map(([locale, body]) => [locale, body ?? ""]),
        )}
        courseId={courseId}
        key={section.id}
        onAutosaveChange={onAutosaveChange}
        sectionId={section.id}
        supportedLocales={supportedLocales}
      />
      <Dialog
        onOpenChange={(open) => !open && !removeMutation.isPending && setIsConfirmingRemove(false)}
        open={isConfirmingRemove}
      >
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{t("draftSection.removeIntroTitle", { section: section.title })}</DialogTitle>
            <DialogDescription>
              {section.introInCommittedVersion
                ? t("draftSection.removeIntroCommitted")
                : t("draftSection.removeIntroNeverCommitted")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsConfirmingRemove(false)} variant="secondary">
              {t("draftSection.cancel")}
            </Button>
            <Button
              data-testid="confirm-remove-section-intro"
              disabled={removeMutation.isPending}
              onClick={() => {
                onAutosaveChange(null);
                removeMutation.mutate(
                  { courseId, sectionId: section.id },
                  { onSettled: () => setIsConfirmingRemove(false) },
                );
              }}
              variant="destructive"
            >
              {t("draftSection.removeIntroConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionIntroDocument({
  bodies,
  courseId,
  onAutosaveChange,
  sectionId,
  supportedLocales,
}: {
  bodies: Partial<Record<Locale, string>>;
  courseId: string;
  onAutosaveChange: (autosave: SectionIntroAutosave | null) => void;
  sectionId: string;
  supportedLocales: Locale[];
}) {
  const { locale: appLocale } = useAppState();
  const document = useLocalizedDocumentDraft({ appLocale, bodies, supportedLocales });
  const updateMutation = useUpdateSectionIntroMutation();

  const buildInput = useCallback(
    (value: DocumentLocaleDraft): UpdateSectionIntroInput => ({
      courseId,
      locales: Object.fromEntries(
        Object.entries(value).map(([locale, blocks]) => [locale, { body: blocksToMarkdown(blocks!) }]),
      ),
      sectionId,
    }),
    [courseId, sectionId],
  );

  const autosave = useEntityAutosave({
    buildInput,
    initialValue: document.seed,
    mutation: updateMutation,
    value: document.draft,
  });

  const { errorMessage, saveNow, status } = autosave;

  useEffect(() => {
    onAutosaveChange({ errorMessage, saveNow, status });
  }, [errorMessage, onAutosaveChange, saveNow, status]);

  useEffect(() => () => onAutosaveChange(null), [onAutosaveChange]);

  return <LocalizedDocumentEditor courseId={courseId} document={document} supportedLocales={supportedLocales} />;
}
