import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, History, Info } from "lucide-react";
import {
  Link,
  Navigate,
  useLocation,
  useOutletContext,
  useParams,
} from "react-router-dom";

import { VersionHistoryDialog } from "@/components/course-details/version-history-dialog";
import { EditorPrototype } from "@/components/editor-prototype/editor-prototype";
import { createInitialDocumentBlocks } from "@/components/editor-prototype/editor-prototype-types";
import { LocalesTabs } from "@/components/locales-tabs";
import { PageActions } from "@/components/page-actions";
import { PageContent } from "@/components/page-content";
import { TestEditorPrototype } from "@/components/test-editor-prototype";
import { TestEditorTagManager } from "@/components/test-editor-tag-manager";
import type { TestEditorState } from "@/components/test-editor-prototype-types";
import { normalizeDraftTestData } from "@/components/test-editor-prototype-logic";
import { fromSharedTestDefinition } from "@/components/test-editor-prototype-persistence";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
import { Button } from "@/components/ui/button";
import { courseRootId } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type {
  ContentRating,
  CourseLayoutOutletContext,
} from "@/components/course-layout";
import type {
  CourseDetails,
  CourseSummary,
  LocalizedCourseMetadata,
} from "@/lib/course-package";
import {
  createCourseTagDefinition,
  normalizeCourseTagLabel,
  type CourseTagDefinition,
} from "@/lib/course-tags";
import { getContentRatingLabelKey } from "@/lib/course-utils";
import { locales, type Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import { queryClient } from "@/lib/query-client";
import { useLessonTestDraftQuery } from "@/lib/course-queries";
import { resolveLessonIdForTest } from "@/lib/course-test-id";
import { useTranslation } from "react-i18next";

type DocumentDraftLocaleValue = {
  blocks: ReturnType<typeof createInitialDocumentBlocks>;
};

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

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

function normalizeSupportedLocales(
  nextLocales: string[],
  fallback: Locale,
): Locale[] {
  const localeSet = new Set<Locale>();

  for (const locale of nextLocales) {
    if (isLocale(locale)) {
      localeSet.add(locale);
    }
  }

  if (localeSet.size === 0) {
    localeSet.add(fallback);
  }

  return locales.filter((locale) => localeSet.has(locale));
}

function getLocaleLabel(locale: Locale, t: (key: string) => string) {
  if (locale === "sr") {
    return t("language.serbian");
  }

  if (locale === "sr-Cyrl") {
    return t("language.serbianCyrillic");
  }

  return t("language.english");
}

function buildPersistedDraftSnapshot({
  contentRating,
  courseId,
  defaultLocale,
  descriptiveTags,
  documentDrafts,
  localizedCourse,
  sectionDrafts,
  supportedLocales,
  testDrafts,
}: {
  contentRating: ContentRating;
  courseId: string;
  defaultLocale: Locale;
  descriptiveTags: CourseTagDefinition[];
  documentDrafts: Record<
    string,
    { locales: Partial<Record<Locale, DocumentDraftLocaleValue>> }
  >;
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>;
  sectionDrafts: Record<
    string,
    { locales: Partial<Record<Locale, SectionDraftLocaleValue>> }
  >;
  supportedLocales: Locale[];
  testDrafts: Record<string, TestEditorState>;
}) {
  const persistedDescriptiveTags = descriptiveTags.filter(
    (tag) => normalizeCourseTagLabel(tag.label).length > 0,
  );
  const persistedTagIds = new Set(
    persistedDescriptiveTags.map((tag) => tag.id),
  );
  const persistedTestDrafts = Object.fromEntries(
    Object.entries(testDrafts).map(([draftId, draftState]) => [
      draftId,
      {
        ...draftState,
        blueprint: draftState.blueprint.filter((rule) =>
          persistedTagIds.has(rule.tagId),
        ),
        exercises: draftState.exercises.map((exercise) => ({
          ...exercise,
          tagIds: exercise.tagIds.filter((tagId) => persistedTagIds.has(tagId)),
        })),
      },
    ]),
  ) satisfies Record<string, TestEditorState>;
  const persistedSectionDrafts = Object.fromEntries(
    Object.entries(sectionDrafts)
      .map(([sectionId, sectionDraft]) => {
        const persistedLocales = Object.fromEntries(
          Object.entries(sectionDraft.locales).filter(([, localeDraft]) =>
            isSectionTitleValid(localeDraft?.title),
          ),
        ) as Partial<Record<Locale, SectionDraftLocaleValue>>;

        return [sectionId, { ...sectionDraft, locales: persistedLocales }] as const;
      })
      .filter(([, sectionDraft]) => Object.keys(sectionDraft.locales).length > 0),
  ) as typeof sectionDrafts;

  return {
    contentRating,
    courseId,
    defaultLocale,
    descriptiveTags: persistedDescriptiveTags,
    documentDrafts,
    localizedCourse: Object.fromEntries(
      supportedLocales.map((locale) => [
        locale,
        localizedCourse[locale] ?? {
          description: "",
          title: "",
        },
      ]),
    ) as Partial<Record<Locale, LocalizedCourseMetadata>>,
    sectionDrafts: persistedSectionDrafts,
    supportedLocales,
    testDrafts: persistedTestDrafts,
    version: 2 as const,
  };
}

export function DraftDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const supportedLocalesAnchor = useComboboxAnchor();
  const courseTitleRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    contentRating,
    courseDescriptiveTags,
    courseDescription,
    courseSections,
    courseTitle,
    defaultLocale,
    initialDraftSnapshot,
    initialDraftSnapshotLoaded,
    localizedCourse,
    selectedNode,
    setContentRating,
    setLocalizedCourse,
    setDraftSnapshot,
    setEditorStatusAction,
    setSelectedNode,
    setSupportedLocales,
    supportedLocales,
    versionBadge,
  } = useOutletContext<CourseLayoutOutletContext>();
  const [activeCourseLocale, setActiveCourseLocale] =
    useState<Locale>(defaultLocale);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const canCommitNewVersion = versionBadge?.kind === "draft";
  const [documentDrafts, setDocumentDrafts] = useState<
    Record<
      string,
      {
        locales: Partial<Record<Locale, DocumentDraftLocaleValue>>;
      }
    >
  >({});
  const [sectionDrafts, setSectionDrafts] = useState<
    Record<
      string,
      {
        locales: Partial<Record<Locale, SectionDraftLocaleValue>>;
      }
    >
  >({});
  const [descriptiveTags, setDescriptiveTags] = useState<CourseTagDefinition[]>(
    [],
  );
  const [testDrafts, setTestDrafts] = useState<Record<string, TestEditorState>>(
    {},
  );
  const [hasHydratedLocalDrafts, setHasHydratedLocalDrafts] = useState(false);
  const shouldAutoFocusCourseTitle =
    (location.state as { focusCourseTitle?: boolean } | null)
      ?.focusCourseTitle === true;
  const serializedDraftSnapshot = useMemo(
    () =>
      courseId && initialDraftSnapshotLoaded && hasHydratedLocalDrafts
        ? JSON.stringify(
            buildPersistedDraftSnapshot({
              contentRating,
              courseId,
              defaultLocale,
              descriptiveTags,
              documentDrafts,
              localizedCourse,
              sectionDrafts,
              supportedLocales,
              testDrafts,
            }),
          )
        : null,
    [
      contentRating,
      courseId,
      defaultLocale,
      descriptiveTags,
      documentDrafts,
      hasHydratedLocalDrafts,
      initialDraftSnapshotLoaded,
      localizedCourse,
      sectionDrafts,
      supportedLocales,
      testDrafts,
    ],
  );

  useEffect(() => {
    setEditorStatusAction(null);
  }, [setEditorStatusAction]);

  useEffect(() => {
    if (!initialDraftSnapshotLoaded || hasHydratedLocalDrafts) {
      return;
    }

    const normalizedDraftTests = normalizeDraftTestData(
      initialDraftSnapshot?.testDrafts ?? {},
      initialDraftSnapshot?.descriptiveTags ?? courseDescriptiveTags,
    );

    setDescriptiveTags(normalizedDraftTests.descriptiveTags);
    setDocumentDrafts(initialDraftSnapshot?.documentDrafts ?? {});
    setSectionDrafts(initialDraftSnapshot?.sectionDrafts ?? {});
    setTestDrafts(normalizedDraftTests.testDrafts);
    setHasHydratedLocalDrafts(true);
  }, [
    courseDescriptiveTags,
    hasHydratedLocalDrafts,
    initialDraftSnapshot,
    initialDraftSnapshotLoaded,
  ]);

  useEffect(() => {
    if (!shouldAutoFocusCourseTitle || selectedNode.id !== courseRootId) {
      return;
    }

    courseTitleRef.current?.focus();
    courseTitleRef.current?.select();
  }, [selectedNode.id, shouldAutoFocusCourseTitle]);

  useEffect(() => {
    if (supportedLocales.includes(activeCourseLocale)) {
      return;
    }

    setActiveCourseLocale(defaultLocale);
  }, [activeCourseLocale, defaultLocale, supportedLocales]);

  const [activeDocumentLocale, setActiveDocumentLocale] =
    useState<Locale>(defaultLocale);

  useEffect(() => {
    if (supportedLocales.includes(activeDocumentLocale)) {
      return;
    }

    setActiveDocumentLocale(defaultLocale);
  }, [activeDocumentLocale, defaultLocale, supportedLocales]);

  const [activeSectionLocale, setActiveSectionLocale] =
    useState<Locale>(defaultLocale);

  useEffect(() => {
    if (supportedLocales.includes(activeSectionLocale)) {
      return;
    }

    setActiveSectionLocale(defaultLocale);
  }, [activeSectionLocale, defaultLocale, supportedLocales]);

  const selectedTestLessonId =
    selectedNode.type === "test" ? resolveLessonIdForTest(selectedNode.id) : null;
  const selectedTestSectionId = selectedTestLessonId
    ? (courseSections.find((section) =>
        section.lessons.some((lesson) => lesson.id === selectedTestLessonId),
      )?.id ?? null)
    : null;
  const lessonTestDraftQuery = useLessonTestDraftQuery(
    courseId && selectedTestLessonId && selectedTestSectionId
      ? { courseId, lessonId: selectedTestLessonId, sectionId: selectedTestSectionId }
      : null,
  );

  useEffect(() => {
    const textarea = descriptionRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [activeCourseLocale, localizedCourse]);

  useEffect(() => {
    if (!serializedDraftSnapshot) {
      return;
    }

    setDraftSnapshot(JSON.parse(serializedDraftSnapshot));
  }, [serializedDraftSnapshot, setDraftSnapshot]);

  useEffect(() => {
    if (!courseId || !hasHydratedLocalDrafts) {
      return;
    }

    queryClient.setQueriesData<CourseSummary[] | undefined>(
      { queryKey: ["courses", "list"] },
      (currentCourses) => {
        if (!currentCourses) {
          return currentCourses;
        }

        return currentCourses.map((course) =>
          course.id === courseId
            ? {
                ...course,
                contentRating,
                description: courseDescription,
                defaultLocale,
                supportedLocales,
                title: courseTitle || "Course",
              }
            : course,
        );
      },
    );

    queryClient.setQueriesData<CourseDetails | null | undefined>(
      { queryKey: ["courses", "detail", courseId] },
      (currentCourse) => {
        if (!currentCourse) {
          return currentCourse;
        }

        return {
          ...currentCourse,
          contentRating,
          description: courseDescription,
          defaultLocale,
          locales: {
            ...currentCourse.locales,
            ...localizedCourse,
          },
          supportedLocales,
          title: courseTitle || "Course",
        };
      },
    );
  }, [
    contentRating,
    courseDescription,
    courseId,
    courseTitle,
    defaultLocale,
    hasHydratedLocalDrafts,
    localizedCourse,
    supportedLocales,
  ]);

  function updateLocalizedCourseField(
    locale: Locale,
    field: keyof LocalizedCourseMetadata,
    value: string,
  ) {
    setLocalizedCourse((currentLocalizedCourse) => ({
      ...currentLocalizedCourse,
      [locale]: {
        description: currentLocalizedCourse[locale]?.description ?? "",
        title: currentLocalizedCourse[locale]?.title ?? "",
        [field]: value,
      },
    }));
  }

  const handleTestStateChange = useCallback(
    (state: TestEditorState) => {
      const lessonId = resolveLessonIdForTest(selectedNode.id);

      setTestDrafts((currentDrafts) => {
        if (currentDrafts[lessonId] === state) {
          return currentDrafts;
        }

        return {
          ...currentDrafts,
          [lessonId]: state,
        };
      });
    },
    [selectedNode.id],
  );

  function updateDescriptiveTag(
    tagId: string,
    patch: Partial<CourseTagDefinition>,
  ) {
    setDescriptiveTags((currentTags) =>
      currentTags.map((tag) => {
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
    );
  }

  function createDescriptiveTag() {
    let nextTagId = "";

    setDescriptiveTags((currentTags) => {
      const nextTag = createCourseTagDefinition("", "sky", currentTags);
      nextTagId = nextTag.id;

      return [...currentTags, nextTag];
    });

    return nextTagId;
  }

  function deleteDescriptiveTag(tagId: string) {
    const remainingTags = descriptiveTags.filter((tag) => tag.id !== tagId);

    setDescriptiveTags(remainingTags);
    setTestDrafts((currentDrafts) =>
      Object.fromEntries(
        Object.entries(currentDrafts).map(([draftId, draftState]) => [
          draftId,
          {
            ...draftState,
            blueprint: draftState.blueprint.map((rule) => ({
              ...rule,
              tagId:
                rule.tagId === tagId
                  ? (remainingTags[0]?.id ?? "")
                  : rule.tagId,
            })),
            exercises: draftState.exercises.map((exercise) => ({
              ...exercise,
              tagIds: exercise.tagIds.filter(
                (currentTagId) => currentTagId !== tagId,
              ),
            })),
          },
        ]),
      ),
    );
  }

  if (!courseId) {
    return <Navigate replace to="/my-courses" />;
  }

  if (!initialDraftSnapshotLoaded || !hasHydratedLocalDrafts) {
    return <PageContent>{null}</PageContent>;
  }

  if (selectedNode.id === courseRootId) {
    const courseActionButtons = (
      <>
        <Button
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
            <TooltipContent>
              {t("courseVersions.noChangesTooltip")}
            </TooltipContent>
          )}
        </Tooltip>
      </>
    );

    return (
      <PageContent actions={<PageActions>{courseActionButtons}</PageActions>}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Eyebrow>Course</Eyebrow>
            <PageActions className="hidden lg:flex">
              {courseActionButtons}
            </PageActions>
          </div>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="draft-course-supported-locales">
                  <span className="flex items-center gap-3">
                    <span>Supported languages</span>
                    <Badge shape="circle" variant="secondary">
                      {supportedLocales.length}
                    </Badge>
                  </span>
                </FieldLabel>
                <Combobox
                  items={locales}
                  multiple
                  onValueChange={(nextLocales) =>
                    setSupportedLocales(
                      normalizeSupportedLocales(
                        nextLocales as string[],
                        i18n.language as Locale,
                      ),
                    )
                  }
                  value={supportedLocales}
                >
                  <ComboboxChips
                    id="draft-course-supported-locales"
                    ref={supportedLocalesAnchor}
                  >
                    <ComboboxValue>
                      {supportedLocales.map((locale) => (
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
          <LocalesTabs
            activeLocale={activeCourseLocale}
            getIsIncomplete={(locale) =>
              (localizedCourse[locale]?.title ?? "").trim().length === 0
            }
            className="pt-1"
            locales={supportedLocales}
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
                        locale === activeCourseLocale
                          ? courseTitleRef
                          : undefined
                      }
                      value={localizedCourse[locale]?.title ?? ""}
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
                        locale === activeCourseLocale
                          ? descriptionRef
                          : undefined
                      }
                      rows={3}
                      value={localizedCourse[locale]?.description ?? ""}
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
                    setContentRating(value as ContentRating)
                  }
                  value={contentRating}
                >
                  <SelectTrigger
                    className="w-full max-w-sm"
                    id="draft-course-content-rating"
                  >
                    <SelectValue>
                      {t(`contentRating.${getContentRatingLabelKey(contentRating)}`)}
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
                    <AccordionTrigger className="flex-none hover:no-underline">
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
                      tags={descriptiveTags}
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
          onOpenChange={setIsVersionHistoryOpen}
          open={isVersionHistoryOpen}
        />
      </PageContent>
    );
  }

  if (selectedNode.type === "test") {
    const lessonId = resolveLessonIdForTest(selectedNode.id);
    const existingDraft = testDrafts[lessonId];

    if (!existingDraft && lessonTestDraftQuery.isLoading) {
      return <PageContent>{null}</PageContent>;
    }

    const hydratedState =
      !existingDraft && lessonTestDraftQuery.data
        ? fromSharedTestDefinition(lessonTestDraftQuery.data, supportedLocales)
        : undefined;

    return (
      <TestEditorPrototype
        descriptiveTags={descriptiveTags}
        initialState={existingDraft ?? hydratedState}
        initialTitle="Test"
        onStateChange={handleTestStateChange}
        supportedLocales={supportedLocales}
      />
    );
  }

  if (selectedNode.type === "section") {
    const realSection = courseSections.find(
      (section) => section.id === selectedNode.id,
    );
    const fallbackSectionLocales = realSection
      ? (Object.fromEntries(
          Object.entries(realSection.locales).map(([locale, metadata]) => [
            locale,
            { description: metadata.description ?? "", title: metadata.title },
          ]),
        ) as Partial<Record<Locale, SectionDraftLocaleValue>>)
      : {};
    const activeSectionDraft = sectionDrafts[selectedNode.id] ?? {
      locales: fallbackSectionLocales,
    };

    return (
      <PageContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Eyebrow>Section</Eyebrow>
            <LocalesTabs
              activeLocale={activeSectionLocale}
              getIsIncomplete={(locale) =>
                !isSectionTitleValid(activeSectionDraft.locales[locale]?.title)
              }
              locales={supportedLocales}
              onActiveLocaleChange={setActiveSectionLocale}
              renderContent={(locale) => (
                <FieldSet className="pt-2">
                  <FieldLegend className="sr-only">
                    {getLocaleLabel(locale, t)}
                  </FieldLegend>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor={`draft-section-title-${locale}`}>
                        Section title
                        <span aria-hidden="true" className="text-rose-600">
                          *
                        </span>
                      </FieldLabel>
                      <Input
                        aria-invalid={
                          !isSectionTitleValid(activeSectionDraft.locales[locale]?.title)
                        }
                        id={`draft-section-title-${locale}`}
                        onChange={(event) => {
                          const title = event.target.value;

                          setSectionDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [selectedNode.id]: {
                              ...activeSectionDraft,
                              locales: {
                                ...activeSectionDraft.locales,
                                [locale]: {
                                  description:
                                    activeSectionDraft.locales[locale]
                                      ?.description ?? "",
                                  title,
                                },
                              },
                            },
                          }));

                          if (locale === defaultLocale) {
                            setSelectedNode({
                              ...selectedNode,
                              title,
                            });
                          }
                        }}
                        placeholder={getInitialSectionTitle(locale)}
                        value={
                          activeSectionDraft.locales[locale]?.title ?? ""
                        }
                      />
                      {getSectionTitleValidationMessage(
                        locale,
                        activeSectionDraft.locales[locale]?.title,
                      ) && (
                        <FieldDescription className="text-rose-600">
                          {getSectionTitleValidationMessage(
                            locale,
                            activeSectionDraft.locales[locale]?.title,
                          )}
                        </FieldDescription>
                      )}
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor={`draft-section-description-${locale}`}
                      >
                        Description
                      </FieldLabel>
                      <Textarea
                        id={`draft-section-description-${locale}`}
                        onChange={(event) =>
                          setSectionDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [selectedNode.id]: {
                              ...activeSectionDraft,
                              locales: {
                                ...activeSectionDraft.locales,
                                [locale]: {
                                  description: event.target.value,
                                  title: activeSectionDraft.locales[locale]?.title ?? "",
                                },
                              },
                            },
                          }))
                        }
                        placeholder="Add a short section description"
                        rows={3}
                        value={
                          activeSectionDraft.locales[locale]?.description ?? ""
                        }
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              )}
            />
          </div>
        </div>
      </PageContent>
    );
  }

  const activeDocumentDraft = documentDrafts[selectedNode.id] ?? {
    locales: {},
  };
  const activeLocalizedDocumentDraft = activeDocumentDraft.locales[
    activeDocumentLocale
  ] ?? {
    blocks: createInitialDocumentBlocks(undefined, activeDocumentLocale),
  };

  return (
    <PageContent fullBleed>
      <EditorPrototype
        activeLocale={activeDocumentLocale}
        blocks={activeLocalizedDocumentDraft.blocks}
        courseId={courseId}
        nodeType={selectedNode.type}
        onBlocksChange={(blocks) =>
          setDocumentDrafts((currentDrafts) => ({
            ...currentDrafts,
            [selectedNode.id]: {
              ...activeDocumentDraft,
              locales: {
                ...activeDocumentDraft.locales,
                [activeDocumentLocale]: {
                  blocks,
                },
              },
            },
          }))
        }
        onActiveLocaleChange={setActiveDocumentLocale}
        supportedLocales={supportedLocales}
      />
    </PageContent>
  );
}
