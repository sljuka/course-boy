import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Eye, History, Info, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PublishCourseButton } from "@/components/course-details/publish-course-button";
import { useRevertWithConfirmation } from "@/components/course-details/use-revert-with-confirmation";
import { ShareCourseButton } from "@/components/course-details/share-course-button";
import { VersionHistoryDialog } from "@/components/course-details/version-history-dialog";
import {
  getLocaleLabel,
  normalizeSupportedLocales,
} from "@/components/draft-details/draft-locale-utils";
import { LocalesTabs } from "@/components/locales-tabs";
import { SerbianScriptSettings } from "@/components/draft-details/serbian-script-settings";
import { CourseActionsMenu } from "@/components/course-actions-menu";
import { CourseMnemonicsEditor } from "@/components/draft-details/course-mnemonics-editor";
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComboboxAnchor } from "@/components/ui/use-combobox-anchor";
import type {
  ContentRating,
  CourseLayoutOutletContext,
} from "@/components/course-layout";
import type {
  CourseSectionPreview,
  LocalizedCourseMetadata,
  UpdateCourseDraftMetadataInput,
} from "@/lib/course-package";
import {
  createCourseTagDefinition,
  normalizeCourseTagLabel,
  type CourseTagDefinition,
} from "@/lib/course-tags";
import { getContentRatingLabelKey } from "@/lib/course-utils";
import { locales, type Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import type { CourseMnemonic } from "@/lib/mnemonics";
import { useCourseVersionHistoryQuery, useUpdateDraftMetadataMutation } from "@/lib/course-queries";
import { useCommitBlockerMessage } from "@/lib/use-commit-blocker";
import {
  detectSerbianScript,
  isSerbianLocale,
  otherSerbianLocale,
  type SerbianScriptSetting,
} from "@/lib/serbian-script";
import { SerbianScriptContext } from "@/lib/use-serbian-script";
import {
  useEntityAutosave,
  useForwardAutosaveStatus,
} from "@/lib/use-entity-autosave";

type CourseMetadataDraft = {
  contentRating: ContentRating;
  descriptiveTags: CourseTagDefinition[];
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>;
  serbianScript: SerbianScriptSetting | null;
  supportedLocales: Locale[];
};

// A Serbian script setting needs both Serbian locales on the course.
function withSerbianLocales(supportedLocales: Locale[], serbianScript: SerbianScriptSetting | null) {
  if (!serbianScript) {
    return supportedLocales;
  }

  return locales.filter(
    (locale) => supportedLocales.includes(locale) || isSerbianLocale(locale),
  );
}

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
  const serbianScript = useContext(SerbianScriptContext);
  const courseTitleRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const [seed] = useState<CourseMetadataDraft>(() => ({
    contentRating,
    descriptiveTags,
    localizedCourse,
    serbianScript,
    supportedLocales,
  }));
  const [draft, setDraft] = useState<CourseMetadataDraft>(seed);
  const [activeCourseLocale, setActiveCourseLocale] =
    useState<Locale>(defaultLocale);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  // Committable: there are changes, and the draft's structure makes a valid
  // version (sections with content). The tooltip says which one is missing.
  const commitBlocker = useCommitBlockerMessage(courseId);
  // From the version history (as the Versions panel and Publish read it, and
  // refetched when the editor opens), so all three agree: anything not in a
  // version yet, or no version at all.
  const { data: versionHistory } = useCourseVersionHistoryQuery(courseId);
  const hasChangesToCommit = versionHistory
    ? versionHistory.versions.length === 0 || !versionHistory.draftMatchesCurrentVersion
    : versionBadge?.kind === "draft";
  const canCommitNewVersion = hasChangesToCommit && commitBlocker === null;
  const updateDraftMetadataMutation = useUpdateDraftMetadataMutation();

  const effectiveDefaultLocale = draft.supportedLocales.includes(defaultLocale)
    ? defaultLocale
    : (draft.supportedLocales[0] ?? defaultLocale);

  const buildInput = useCallback(
    (value: CourseMetadataDraft): UpdateCourseDraftMetadataInput => ({
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
      serbianScript: value.serbianScript,
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
    field: "description" | "title",
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      localizedCourse: {
        ...current.localizedCourse,
        [locale]: {
          ...current.localizedCourse[locale],
          description: current.localizedCourse[locale]?.description ?? "",
          title: current.localizedCourse[locale]?.title ?? "",
          [field]: value,
        },
      },
    }));
  }

  function updateLocalizedMnemonics(locale: Locale, mnemonics: CourseMnemonic[]) {
    setDraft((current) => ({
      ...current,
      localizedCourse: {
        ...current.localizedCourse,
        [locale]: {
          description: current.localizedCourse[locale]?.description ?? "",
          title: current.localizedCourse[locale]?.title ?? "",
          ...current.localizedCourse[locale],
          mnemonics,
        },
      },
    }));
  }

  function updateDescriptiveTag(
    tagId: string,
    patch: Partial<CourseTagDefinition>,
  ) {
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
      const nextTag = createCourseTagDefinition(
        "",
        "sky",
        current.descriptiveTags,
      );
      nextTagId = nextTag.id;

      return {
        ...current,
        descriptiveTags: [...current.descriptiveTags, nextTag],
      };
    });

    return nextTagId;
  }

  function deleteDescriptiveTag(tagId: string) {
    setDraft((current) => ({
      ...current,
      descriptiveTags: current.descriptiveTags.filter(
        (tag) => tag.id !== tagId,
      ),
    }));
  }

  const commitLabel = canCommitNewVersion
    ? t("courseVersions.commitButton")
    : hasChangesToCommit && commitBlocker
      ? commitBlocker
      : t("courseVersions.noChangesTooltip");

  const courseActionButtons = (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={t("courseVersions.previewCourse")}
              nativeButton={false}
              render={<Link to={`/courses/${courseId}`} />}
              shape="circle"
              size="icon-sm"
              variant="secondary"
            />
          }
        >
          <Eye aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{t("courseVersions.previewCourse")}</TooltipContent>
      </Tooltip>
      <ShareCourseButton courseId={courseId} />
      {/* Commit without publishing. Disabled with the reason as its tooltip;
          a disabled button gets no hover events, so the span carries it. */}
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            aria-label={commitLabel}
            data-testid="commit-new-version"
            disabled={!canCommitNewVersion}
            onClick={() => setIsVersionHistoryOpen(true)}
            shape="circle"
            size="icon-sm"
            variant="secondary"
          >
            <History aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{commitLabel}</TooltipContent>
      </Tooltip>
      <PublishCourseButton courseId={courseId} />
    </>
  );

  // Discard changes (back to the version the draft is based on), red in the
  // ⋯ menu, only while there are changes and a version to go back to. Asks
  // first, like the Versions panel's.
  const canDiscard =
    Boolean(versionHistory?.versions.length) && versionHistory?.draftMatchesCurrentVersion === false;
  const { confirmationDialog: discardConfirmation, requestDiscard, revertMutation } =
    useRevertWithConfirmation(courseId);
  const discardMenuItem = canDiscard && (
    <DropdownMenuItem
      data-testid="discard-changes"
      disabled={revertMutation.isPending}
      onClick={requestDiscard}
      variant="destructive"
    >
      <Undo2 aria-hidden="true" />
      {t("courseVersions.discardChanges")}
    </DropdownMenuItem>
  );

  return (
    <PageContent
      actions={
        <>
          {courseActionButtons}
          <CourseActionsMenu
            afterRemovePath="/my-courses"
            course={{ id: courseId, title: draft.localizedCourse[defaultLocale]?.title ?? "" }}
            destructiveItems={discardMenuItem}
          />
          {discardConfirmation}
        </>
      }
    >
      <div className="flex flex-col gap-6">
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
                  setDraft((current) => {
                    const supportedLocales = normalizeSupportedLocales(
                      nextLocales as string[],
                      i18n.language as Locale,
                    );
                    const serbianBefore = current.supportedLocales.filter(isSerbianLocale);
                    const serbianAfter = supportedLocales.filter(isSerbianLocale);
                    let nextSerbianScript = current.serbianScript;

                    if (serbianBefore.length === 0 && serbianAfter.length > 0) {
                      // Serbian just added: write in the script added (or,
                      // with both, the one existing text mostly uses) and
                      // generate the other.
                      nextSerbianScript = {
                        source:
                          serbianAfter.length === 1
                            ? serbianAfter[0]
                            : (detectSerbianScript(
                                serbianAfter.flatMap((locale) => [
                                  current.localizedCourse[locale]?.title ?? "",
                                  current.localizedCourse[locale]?.description ?? "",
                                ]),
                              ) ?? "sr"),
                      };
                    } else if (serbianAfter.length < 2) {
                      // A Serbian script taken off: nothing to generate.
                      nextSerbianScript = null;
                    }

                    return {
                      ...current,
                      serbianScript: nextSerbianScript,
                      supportedLocales: withSerbianLocales(supportedLocales, nextSerbianScript),
                    };
                  })
                }
                value={draft.supportedLocales}
              >
                <ComboboxChips
                  id="draft-course-supported-locales"
                  ref={supportedLocalesAnchor}
                >
                  <ComboboxValue>
                    {draft.supportedLocales.map((locale) => (
                      <ComboboxChip key={locale} showRemove>
                        <span className="text-base leading-none">
                          {getLocaleFlag(locale)}
                        </span>
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
                        <span className="text-base leading-none">
                          {getLocaleFlag(locale)}
                        </span>
                        <span>{getLocaleLabel(locale, t)}</span>
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Field>
          </FieldGroup>
        </FieldSet>
        {draft.supportedLocales.some(isSerbianLocale) && (
          <SerbianScriptSettings
            hasGeneratedLocaleText={(source) =>
              draft.supportedLocales.includes(otherSerbianLocale(source))
            }
            onChange={(nextSerbianScript) =>
              setDraft((current) => ({
                ...current,
                serbianScript: nextSerbianScript,
                supportedLocales: withSerbianLocales(current.supportedLocales, nextSerbianScript),
              }))
            }
            value={draft.serbianScript}
          />
        )}
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
              <FieldLegend className="sr-only">
                {getLocaleLabel(locale, t)}
              </FieldLegend>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`draft-course-title-${locale}`}>
                    Course title
                  </FieldLabel>
                  <Input
                    className="h-9 text-base"
                    id={`draft-course-title-${locale}`}
                    onChange={(event) =>
                      updateLocalizedCourseField(
                        locale,
                        "title",
                        event.target.value,
                      )
                    }
                    placeholder="Course"
                    ref={
                      locale === activeCourseLocale ? courseTitleRef : undefined
                    }
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
                      updateLocalizedCourseField(
                        locale,
                        "description",
                        event.target.value,
                      )
                    }
                    placeholder="Add a short course description"
                    ref={
                      locale === activeCourseLocale ? descriptionRef : undefined
                    }
                    rows={3}
                    value={draft.localizedCourse[locale]?.description ?? ""}
                  />
                </Field>
                <CourseMnemonicsEditor
                  locale={locale}
                  mnemonics={draft.localizedCourse[locale]?.mnemonics ?? []}
                  onChange={(mnemonics) => updateLocalizedMnemonics(locale, mnemonics)}
                />
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
                  setDraft((current) => ({
                    ...current,
                    contentRating: value as ContentRating,
                  }))
                }
                value={draft.contentRating}
              >
                <SelectTrigger
                  className="w-full max-w-sm"
                  id="draft-course-content-rating"
                >
                  <SelectValue>
                    {t(
                      `contentRating.${getContentRatingLabelKey(draft.contentRating)}`,
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-ages">
                    {t("contentRating.allAges")}
                  </SelectItem>
                  <SelectItem value="mature-themes">
                    {t("contentRating.matureThemes")}
                  </SelectItem>
                  <SelectItem value="explicit">
                    {t("contentRating.explicit")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Accordion>
              <AccordionItem value="descriptive-tags">
                <div className="flex items-center gap-1">
                  <AccordionTrigger className="flex-none">
                    Manage tags
                  </AccordionTrigger>
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
            <AlertDescription>
              {t("courseDetails.noSectionsHint")}
            </AlertDescription>
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
