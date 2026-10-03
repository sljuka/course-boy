import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { getLocaleLabel } from "@/components/draft-details/draft-locale-utils";
import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { CourseLayoutOutletContext } from "@/components/course-layout";
import { LocalesTabs } from "@/components/locales-tabs";
import { PageContent } from "@/components/page-content";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  SectionIntroArea,
  type SectionIntroAutosave,
} from "@/components/draft-details/section-intro-editor";
import type { CourseSectionPreview, LocalizedSectionMetadata, UpdateCourseSectionInput } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { useUpdateSectionMutation } from "@/lib/course-queries";
import { countCharacters, SECTION_SUMMARY_MAX_LENGTH } from "@/lib/section-summary";
import {
  mergeAutosaveStatuses,
  useEntityAutosave,
  useForwardAutosaveStatus,
} from "@/lib/use-entity-autosave";

type SectionDraftLocaleValue = {
  description: string;
  title: string;
};

function getInitialSectionTitle(locale: Locale) {
  switch (locale) {
    case "sr":
      return "Naslov poglavlja";
    case "sr-Cyrl":
      return "Наслов поглавља";
    case "en":
      return "Section title";
  }
}

function isSectionTitleValid(title: string | undefined): boolean {
  return (title?.trim().length ?? 0) > 0;
}

function getSectionTitleValidationMessage(
  locale: Locale,
  title: string | undefined,
) {
  if (!isSectionTitleValid(title)) {
    return `Section title for ${locale} is required.`;
  }

  return null;
}

function buildSectionLocales(
  section: CourseSectionPreview | undefined,
): Partial<Record<Locale, SectionDraftLocaleValue>> {
  if (!section) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(section.locales).map(([locale, metadata]) => [
      locale,
      { description: metadata.description ?? "", title: metadata.title },
    ]),
  );
}

export function DraftSectionEditor({
  courseId,
  defaultLocale,
  reportAutosaveStatus,
  section,
  selectedNode,
  setSelectedNode,
  supportedLocales,
}: {
  courseId: string;
  defaultLocale: Locale;
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  section: CourseSectionPreview | undefined;
  selectedNode: StructureSelection;
  setSelectedNode: (selection: StructureSelection) => void;
  supportedLocales: Locale[];
}) {
  const { t } = useTranslation();
  const [seed] = useState(() => buildSectionLocales(section));
  const [locales, setLocales] = useState(seed);
  const [activeSectionLocale, setActiveSectionLocale] = useState<Locale>(defaultLocale);
  const updateSectionMutation = useUpdateSectionMutation();

  useEffect(() => {
    if (supportedLocales.includes(activeSectionLocale)) {
      return;
    }

    setActiveSectionLocale(defaultLocale);
  }, [activeSectionLocale, defaultLocale, supportedLocales]);

  const buildInput = useCallback(
    (value: typeof seed): UpdateCourseSectionInput => ({
      courseId,
      locales: value as Partial<Record<Locale, LocalizedSectionMetadata>>,
      sectionId: selectedNode.id,
    }),
    [courseId, selectedNode.id],
  );

  const autosave = useEntityAutosave({
    buildInput,
    initialValue: seed,
    mutation: updateSectionMutation,
    value: locales,
  });

  // The intro (if any) autosaves on its own; the status bar shows one status
  // for the whole page.
  const [introAutosave, setIntroAutosave] = useState<SectionIntroAutosave | null>(null);
  const { errorMessage: fieldsError, saveNow: saveFieldsNow, status: fieldsStatus } = autosave;
  const saveIntroNow = introAutosave?.saveNow;
  const saveNow = useCallback(() => {
    saveFieldsNow();
    saveIntroNow?.();
  }, [saveFieldsNow, saveIntroNow]);
  const pageAutosave = useMemo(
    () => ({
      errorMessage: fieldsError ?? introAutosave?.errorMessage ?? null,
      saveNow,
      status: mergeAutosaveStatuses([fieldsStatus, ...(introAutosave ? [introAutosave.status] : [])]),
    }),
    [fieldsError, fieldsStatus, introAutosave, saveNow],
  );

  useForwardAutosaveStatus(reportAutosaveStatus, pageAutosave);

  function updateLocale(locale: Locale, patch: Partial<SectionDraftLocaleValue>) {
    setLocales((current) => ({
      ...current,
      [locale]: {
        description: current[locale]?.description ?? "",
        title: current[locale]?.title ?? "",
        ...patch,
      },
    }));

    if (patch.title !== undefined && locale === defaultLocale) {
      setSelectedNode({ ...selectedNode, title: patch.title });
    }
  }

  return (
    <PageContent>
      <LocalesTabs
        activeLocale={activeSectionLocale}
        getIsIncomplete={(locale) => !isSectionTitleValid(locales[locale]?.title)}
        locales={supportedLocales}
        onActiveLocaleChange={setActiveSectionLocale}
        renderContent={(locale) => (
          <FieldSet className="pt-2">
            <FieldLegend className="sr-only">{getLocaleLabel(locale, t)}</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`draft-section-title-${locale}`}>
                  Section title
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FieldLabel>
                <Input
                  aria-invalid={!isSectionTitleValid(locales[locale]?.title)}
                  id={`draft-section-title-${locale}`}
                  onChange={(event) => updateLocale(locale, { title: event.target.value })}
                  placeholder={getInitialSectionTitle(locale)}
                  value={locales[locale]?.title ?? ""}
                />
                {getSectionTitleValidationMessage(locale, locales[locale]?.title) && (
                  <FieldDescription variant="destructive">
                    {getSectionTitleValidationMessage(locale, locales[locale]?.title)}
                  </FieldDescription>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor={`draft-section-summary-${locale}`}>
                  {t("draftSection.summaryLabel")}
                </FieldLabel>
                <Input
                  aria-invalid={countCharacters(locales[locale]?.description ?? "") > SECTION_SUMMARY_MAX_LENGTH}
                  id={`draft-section-summary-${locale}`}
                  onChange={(event) => {
                    const next = event.target.value;
                    const current = locales[locale]?.description ?? "";
                    // Typing stops at the limit; an older, longer description
                    // can still be shortened.
                    if (
                      countCharacters(next) > SECTION_SUMMARY_MAX_LENGTH &&
                      countCharacters(next) >= countCharacters(current)
                    ) {
                      return;
                    }
                    updateLocale(locale, { description: next });
                  }}
                  placeholder={t("draftSection.summaryPlaceholder")}
                  value={locales[locale]?.description ?? ""}
                />
                <FieldDescription
                  variant={
                    countCharacters(locales[locale]?.description ?? "") > SECTION_SUMMARY_MAX_LENGTH
                      ? "destructive"
                      : undefined
                  }
                >
                  {countCharacters(locales[locale]?.description ?? "") > SECTION_SUMMARY_MAX_LENGTH
                    ? t("draftSection.summaryTooLong", {
                        count: countCharacters(locales[locale]?.description ?? ""),
                        max: SECTION_SUMMARY_MAX_LENGTH,
                      })
                    : t("draftSection.summaryHint", {
                        count: countCharacters(locales[locale]?.description ?? ""),
                        max: SECTION_SUMMARY_MAX_LENGTH,
                      })}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
        )}
      />
      {section && (
        <SectionIntroArea
          courseId={courseId}
          onAutosaveChange={setIntroAutosave}
          section={section}
          sectionTitles={Object.fromEntries(
            Object.entries(locales).map(([locale, value]) => [locale, value?.title ?? ""]),
          )}
          supportedLocales={supportedLocales}
        />
      )}
    </PageContent>
  );
}
