import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, History, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { VersionHistoryDialog } from "@/components/course-details/version-history-dialog";
import { getLocaleLabel, normalizeSupportedLocales } from "@/components/draft-details/draft-locale-utils";
import { LocalesTabs } from "@/components/locales-tabs";
import { PageActions } from "@/components/page-actions";
import { PageContent } from "@/components/page-content";
import { TestEditorTagManager } from "@/components/test-editor-tag-manager";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useComboboxAnchor } from "@/components/ui/use-combobox-anchor";
import type { ContentRating, CourseLayoutOutletContext } from "@/components/course-layout";
import type { CourseSectionPreview, LocalizedCourseMetadata } from "@/lib/course-package";
import {
  createCourseTagDefinition,
  normalizeCourseTagLabel,
  type CourseTagDefinition,
} from "@/lib/course-tags";
import { getContentRatingLabelKey } from "@/lib/course-utils";
import { locales, type Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import { useUpdateDraftMetadataMutation } from "@/lib/course-queries";
import { useEntityAutosave, useForwardAutosaveStatus } from "@/lib/use-entity-autosave";

type CourseMetadataDraft = {
  contentRating: ContentRating;
  descriptiveTags: CourseTagDefinition[];
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>;
  supportedLocales: Locale[];
};

export function CourseMetadataEditor({
  contentRating,
  courseId,
  courseSections,
  defaultLocale,
  descriptiveTags,
  localizedCourse,
  reportAutosaveStatus,
  supportedLocales,
  versionBadge,
}: {
  contentRating: ContentRating;
  courseId: string;
  courseSections: CourseSectionPreview[];
  defaultLocale: Locale;
  descriptiveTags: CourseTagDefinition[];
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>;
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  supportedLocales: Locale[];
  versionBadge: CourseLayoutOutletContext["versionBadge"];
}) {
  const { t, i18n } = useTranslation();
  const supportedLocalesAnchor = useComboboxAnchor();
  const courseTitleRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const [seed] = useState<CourseMetadataDraft>(() => ({
    contentRating,
    descriptiveTags,
    localizedCourse,
    supportedLocales,
  }));
  const [draft, setDraft] = useState<CourseMetadataDraft>(seed);
  const [activeCourseLocale, setActiveCourseLocale] = useState<Locale>(defaultLocale);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const canCommitNewVersion = versionBadge?.kind === "draft";
  const updateDraftMetadataMutation = useUpdateDraftMetadataMutation();

  const effectiveDefaultLocale = draft.supportedLocales.includes(defaultLocale)
    ? defaultLocale
    : (draft.supportedLocales[0] ?? defaultLocale);

  const buildInput = useCallback(
    (value: CourseMetadataDraft) => ({
      contentRating: value.contentRating,
      courseId,
      defaultLocale: value.supportedLocales.includes(defaultLocale)
        ? defaultLocale
        : (value.supportedLocales[0] ?? defaultLocale),
      descriptiveTags: value.descriptiveTags.filter(
        (tag) => normalizeCourseTagLabel(tag.label).length > 0,
      ),
      locales: Object.fromEntries(
        value.supportedLocales.map((locale) => [
          locale,
          value.localizedCourse[locale] ?? { description: "", title: "" },
        ]),
      ),
      supportedLocales: value.supportedLocales,
    }),
    [courseId, defaultLocale],
  );

  const autosave = useEntityAutosave({
    buildInput,
    initialValue: seed,
    mutation: updateDraftMetadataMutation,
    value: draft,
  });

  useForwardAutosaveStatus(reportAutosaveStatus, autosave);

  useEffect(() => {
    if (draft.supportedLocales.includes(activeCourseLocale)) {
      return;
    }

    setActiveCourseLocale(effectiveDefaultLocale);
  }, [activeCourseLocale, draft.supportedLocales, effectiveDefaultLocale]);

  useEffect(() => {
    const textarea = descriptionRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [activeCourseLocale, draft.localizedCourse]);

  function updateLocalizedCourseField(
    locale: Locale,
    field: keyof LocalizedCourseMetadata,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      localizedCourse: {
        ...current.localizedCourse,
        [locale]: {
          description: current.localizedCourse[locale]?.description ?? "",
          title: current.localizedCourse[locale]?.title ?? "",
          [field]: value,
        },
      },
    }));
  }

  function updateDescriptiveTag(tagId: string, patch: Partial<CourseTagDefinition>) {
    setDraft((current) => ({
      ...current,
      descriptiveTags: current.descriptiveTags.map((tag) => {
        if (tag.id !== tagId) {
          return tag;
        }

        return {
          ...tag,
          ...patch,
          label:
            typeof patch.label === "string"
              ? normalizeCourseTagLabel(patch.label)
              : tag.label,
        };
      }),
    }));
  }

  function createDescriptiveTag() {
    let nextTagId = "";

    setDraft((current) => {
      const nextTag = createCourseTagDefinition("", "sky", current.descriptiveTags);
      nextTagId = nextTag.id;

      return { ...current, descriptiveTags: [...current.descriptiveTags, nextTag] };
    });

    return nextTagId;
  }

  function deleteDescriptiveTag(tagId: string) {
    setDraft((current) => ({
      ...current,
      descriptiveTags: current.descriptiveTags.filter((tag) => tag.id !== tagId),
    }));
  }

  const courseActionButtons = (
    <>
      <Button
        nativeButton={false}
        render={<Link to={`/courses/${courseId}`} />}
        size="sm"
        variant="secondary"
      >
        <Eye aria-hidden="true" className="h-4 w-4" />
        {t("courseVersions.previewCourse")}
      </Button>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            disabled={!canCommitNewVersion}
            onClick={() => setIsVersionHistoryOpen(true)}
            size="sm"
            variant="secondary"
          >
            <History aria-hidden="true" className="h-4 w-4" />
            {t("courseVersions.commitButton")}
          </Button>
        </TooltipTrigger>
        {!canCommitNewVersion && (
          <TooltipContent>{t("courseVersions.noChangesTooltip")}</TooltipContent>
        )}
      </Tooltip>
    </>
  );

  return (
    <PageContent actions={<PageActions>{courseActionButtons}</PageActions>}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <Eyebrow>Course</Eyebrow>
          <PageActions className="hidden lg:flex">{courseActionButtons}</PageActions>
        </div>
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="draft-course-supported-locales">
                <span className="flex items-center gap-3">
                  <span>Supported languages</span>
                  <Badge shape="circle" variant="secondary">
                    {draft.supportedLocales.length}
                  </Badge>
                </span>
              </FieldLabel>
              <Combobox
                items={locales}
                multiple
                onValueChange={(nextLocales) =>
                  setDraft((current) => ({
                    ...current,
                    supportedLocales: normalizeSupportedLocales(
                      nextLocales as string[],
                      i18n.language as Locale,
                    ),
                  }))
                }
                value={draft.supportedLocales}
              >
                <ComboboxChips id="draft-course-supported-locales" ref={supportedLocalesAnchor}>
                  <ComboboxValue>
                    {draft.supportedLocales.map((locale) => (
                      <ComboboxChip key={locale} showRemove>
                        <span className="text-base leading-none">{getLocaleFlag(locale)}</span>
                        <span>{getLocaleLabel(locale, t)}</span>
                      </ComboboxChip>
                    ))}
                  </ComboboxValue>
                  <ComboboxChipsInput placeholder="Add supported languages" />
                </ComboboxChips>
                <ComboboxContent anchor={supportedLocalesAnchor}>
                  <ComboboxEmpty>No languages found.</ComboboxEmpty>
                  <ComboboxList>
                    {locales.map((locale) => (
                      <ComboboxItem key={locale} value={locale}>
                        <span className="text-base leading-none">{getLocaleFlag(locale)}</span>
                        <span>{getLocaleLabel(locale, t)}</span>
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Field>
          </FieldGroup>
        </FieldSet>
        <LocalesTabs
          activeLocale={activeCourseLocale}
          getIsIncomplete={(locale) =>
            (draft.localizedCourse[locale]?.title ?? "").trim().length === 0
          }
          className="pt-1"
          locales={draft.supportedLocales}
          onActiveLocaleChange={setActiveCourseLocale}
          renderContent={(locale) => (
            <FieldSet className="pt-2">
              <FieldLegend className="sr-only">{getLocaleLabel(locale, t)}</FieldLegend>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`draft-course-title-${locale}`}>Course title</FieldLabel>
                  <Input
                    className="h-9 text-base"
                    id={`draft-course-title-${locale}`}
                    onChange={(event) =>
                      updateLocalizedCourseField(locale, "title", event.target.value)
                    }
                    placeholder="Course"
                    ref={locale === activeCourseLocale ? courseTitleRef : undefined}
                    value={draft.localizedCourse[locale]?.title ?? ""}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`draft-course-description-${locale}`}>
                    Description
                  </FieldLabel>
                  <Textarea
                    id={`draft-course-description-${locale}`}
                    onChange={(event) =>
                      updateLocalizedCourseField(locale, "description", event.target.value)
                    }
                    placeholder="Add a short course description"
                    ref={locale === activeCourseLocale ? descriptionRef : undefined}
                    rows={3}
                    value={draft.localizedCourse[locale]?.description ?? ""}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          )}
        />
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="draft-course-content-rating">
                {t("contentRating.label")}
              </FieldLabel>
              <Select
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, contentRating: value as ContentRating }))
                }
                value={draft.contentRating}
              >
                <SelectTrigger className="w-full max-w-sm" id="draft-course-content-rating">
                  <SelectValue>
                    {t(`contentRating.${getContentRatingLabelKey(draft.contentRating)}`)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-ages">{t("contentRating.allAges")}</SelectItem>
                  <SelectItem value="mature-themes">{t("contentRating.matureThemes")}</SelectItem>
                  <SelectItem value="explicit">{t("contentRating.explicit")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Accordion>
              <AccordionItem value="descriptive-tags">
                <div className="flex items-center gap-1">
                  <AccordionTrigger className="flex-none">Manage tags</AccordionTrigger>
                  <InfoTooltip aria-label={t("courseTags.helpTooltip")}>
                    {t("courseTags.helpTooltip")}
                  </InfoTooltip>
                </div>
                <AccordionContent>
                  <TestEditorTagManager
                    hideHeader
                    onCreateTag={createDescriptiveTag}
                    onDeleteTag={deleteDescriptiveTag}
                    onUpdateTag={updateDescriptiveTag}
                    tags={draft.descriptiveTags}
                    unstyled
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </FieldGroup>
        </FieldSet>
        {courseSections.length === 0 && (
          <Alert variant="info">
            <Info aria-hidden="true" className="size-4" />
            <AlertTitle>{t("courseDetails.noSectionsTitle")}</AlertTitle>
            <AlertDescription>{t("courseDetails.noSectionsHint")}</AlertDescription>
          </Alert>
        )}
      </div>
      <VersionHistoryDialog
        courseId={courseId}
        mode="editor"
        onOpenChange={setIsVersionHistoryOpen}
        open={isVersionHistoryOpen}
      />
    </PageContent>
  );
}
