import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, History, Info } from "lucide-react";
import { Link, Navigate, useOutletContext, useParams } from "react-router-dom";

import { VersionHistoryDialog } from "@/components/course-details/version-history-dialog";
import { EditorPrototype } from "@/components/editor-prototype/editor-prototype";
import {
  createInitialDocumentBlocks,
  type EditorPrototypeBlock,
} from "@/components/editor-prototype/editor-prototype-types";
import { LocalesTabs } from "@/components/locales-tabs";
import { PageActions } from "@/components/page-actions";
import { PageContent } from "@/components/page-content";
import { TestEditorPrototype } from "@/components/test-editor-prototype";
import { TestEditorTagManager } from "@/components/test-editor-tag-manager";
import type { TestEditorState } from "@/components/test-editor-prototype-types";
import { createInitialState } from "@/components/test-editor-prototype-logic";
import {
  fromSharedTestDefinition,
  toSharedTestDefinition,
} from "@/components/test-editor-prototype-persistence";
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
import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type {
  ContentRating,
  CourseLayoutOutletContext,
} from "@/components/course-layout";
import type {
  CourseLesson,
  CourseSectionPreview,
  LocalizedCourseMetadata,
  LocalizedSectionMetadata,
  SaveLessonTestInput,
  SaveSectionTestInput,
  SharedTestDefinition,
  UpdateCourseSectionInput,
  UpdateLessonContentInput,
} from "@/lib/course-package";
import {
  createCourseTagDefinition,
  normalizeCourseTagLabel,
  type CourseTagDefinition,
} from "@/lib/course-tags";
import { getContentRatingLabelKey } from "@/lib/course-utils";
import { locales, type Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import { blocksToMarkdown, markdownToBlocks } from "@/lib/lesson-content-markdown";
import {
  useLessonTestDraftQuery,
  useSaveLessonTestMutation,
  useSaveSectionTestMutation,
  useSectionTestDraftQuery,
  useUpdateDraftMetadataMutation,
  useUpdateLessonContentMutation,
  useUpdateSectionMutation,
} from "@/lib/course-queries";
import { resolveLessonIdForTest } from "@/lib/course-test-id";
import { useEntityAutosave, useForwardAutosaveStatus } from "@/lib/use-entity-autosave";
import { useAppState } from "@/lib/use-app-state";
import { useTranslation } from "react-i18next";

type SectionDraftLocaleValue = {
  description: string;
  title: string;
};

type CourseMetadataDraft = {
  contentRating: ContentRating;
  descriptiveTags: CourseTagDefinition[];
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>;
  supportedLocales: Locale[];
};

type DocumentLocaleDraft = Partial<Record<Locale, EditorPrototypeBlock[]>>;

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

// A registered tag is one that shows up in the "Add tag" combobox — an
// exercise or blueprint rule referencing anything else (typically a tag
// deleted from another session, or set by hand via a direct IPC call) is
// stripped at save time. See the "known rough edge" note in CLAUDE.md.
function toPersistableSharedTestDefinition(
  state: TestEditorState,
  descriptiveTags: CourseTagDefinition[],
): SharedTestDefinition {
  const registeredTagIds = new Set(
    descriptiveTags
      .filter((tag) => normalizeCourseTagLabel(tag.label).length > 0)
      .map((tag) => tag.id),
  );
  const shared = toSharedTestDefinition(state);

  return {
    ...shared,
    exercises: shared.exercises.map((exercise) => ({
      ...exercise,
      tags: exercise.tags.filter((tagId) => registeredTagIds.has(tagId)),
    })),
    ...(shared.structure
      ? { structure: shared.structure.filter((rule) => registeredTagIds.has(rule.tag)) }
      : {}),
  };
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

export function DraftDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { locale: appLocale } = useAppState();
  const {
    contentRating,
    courseDescriptiveTags,
    courseSections,
    defaultLocale,
    isCourseDetailsLoading,
    localizedCourse,
    reportAutosaveStatus,
    selectedNode,
    setEditorStatusAction,
    setSelectedNode,
    supportedLocales,
    versionBadge,
  } = useOutletContext<CourseLayoutOutletContext>();

  useEffect(() => {
    setEditorStatusAction(null);
  }, [setEditorStatusAction]);

  if (!courseId) {
    return <Navigate replace to="/my-courses" />;
  }

  if (isCourseDetailsLoading) {
    return <PageContent>{null}</PageContent>;
  }

  if (selectedNode.id === courseRootId) {
    return (
      <CourseMetadataEditor
        contentRating={contentRating}
        courseId={courseId}
        courseSections={courseSections}
        defaultLocale={defaultLocale}
        descriptiveTags={courseDescriptiveTags}
        localizedCourse={localizedCourse}
        reportAutosaveStatus={reportAutosaveStatus}
        supportedLocales={supportedLocales}
        versionBadge={versionBadge}
      />
    );
  }

  if (selectedNode.type === "test") {
    return (
      <DraftTestEditor
        key={selectedNode.id}
        courseId={courseId}
        courseSections={courseSections}
        descriptiveTags={courseDescriptiveTags}
        reportAutosaveStatus={reportAutosaveStatus}
        selectedNode={selectedNode}
        supportedLocales={supportedLocales}
      />
    );
  }

  if (selectedNode.type === "section") {
    const section = courseSections.find((candidate) => candidate.id === selectedNode.id);

    return (
      <DraftSectionEditor
        key={selectedNode.id}
        courseId={courseId}
        defaultLocale={defaultLocale}
        reportAutosaveStatus={reportAutosaveStatus}
        section={section}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        supportedLocales={supportedLocales}
      />
    );
  }

  const documentSection = courseSections.find((section) =>
    section.lessons.some((lesson) => lesson.id === selectedNode.id),
  );
  const lesson = documentSection?.lessons.find((candidate) => candidate.id === selectedNode.id);

  if (!documentSection || !lesson) {
    return <PageContent>{null}</PageContent>;
  }

  return (
    <DraftDocumentEditor
      key={selectedNode.id}
      appLocale={appLocale}
      courseId={courseId}
      lesson={lesson}
      reportAutosaveStatus={reportAutosaveStatus}
      sectionId={documentSection.id}
      selectedNode={selectedNode}
      supportedLocales={supportedLocales}
    />
  );
}

function CourseMetadataEditor({
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

// A selected "test" node is either a standalone CourseSectionTest (its id is
// found directly in some section's `tests`) or a lesson-attached test (its
// id is derived from a lesson id via resolveLessonIdForTest) — these are two
// different persisted things with different save/draft plumbing.
function DraftTestEditor({
  courseId,
  courseSections,
  descriptiveTags,
  reportAutosaveStatus,
  selectedNode,
  supportedLocales,
}: {
  courseId: string;
  courseSections: CourseSectionPreview[];
  descriptiveTags: CourseTagDefinition[];
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
}) {
  const standaloneSectionId =
    courseSections.find((section) => section.tests.some((test) => test.id === selectedNode.id))
      ?.id ?? null;
  const isStandalone = standaloneSectionId !== null;
  const lessonId = isStandalone ? null : resolveLessonIdForTest(selectedNode.id);
  const lessonSectionId = lessonId
    ? (courseSections.find((section) => section.lessons.some((lesson) => lesson.id === lessonId))
        ?.id ?? null)
    : null;

  const lessonTestDraftQuery = useLessonTestDraftQuery(
    !isStandalone && lessonId && lessonSectionId
      ? { courseId, lessonId, sectionId: lessonSectionId }
      : null,
  );
  const sectionTestDraftQuery = useSectionTestDraftQuery(
    isStandalone && standaloneSectionId
      ? { courseId, sectionId: standaloneSectionId, testId: selectedNode.id }
      : null,
  );
  const activeQuery = isStandalone ? sectionTestDraftQuery : lessonTestDraftQuery;

  // `isFetching` (not just `isLoading`) matters here: a fresh mount of this
  // page (e.g. returning from the "Preview test" route) can find this query
  // already cached from earlier in the session but stale — invalidated once
  // this test's own autosave landed — which would otherwise serve the *old*
  // cached value instantly while a refetch runs in the background.
  if (activeQuery.isLoading || activeQuery.isFetching) {
    return <PageContent>{null}</PageContent>;
  }

  if (isStandalone) {
    return (
      <DraftStandaloneTestEditor
        courseId={courseId}
        descriptiveTags={descriptiveTags}
        initialSharedTest={sectionTestDraftQuery.data ?? null}
        reportAutosaveStatus={reportAutosaveStatus}
        sectionId={standaloneSectionId!}
        selectedNode={selectedNode}
        supportedLocales={supportedLocales}
      />
    );
  }

  // This test is attached to (follows) its own lesson document — default its
  // name to that document's title rather than the generic "Test", for the
  // same reason a standalone test defaults to the section's last document's
  // title (see `startAddTest` in course-structure-prototype.tsx).
  const lessonTitle = courseSections
    .flatMap((section) => section.lessons)
    .find((lesson) => lesson.id === lessonId)?.title;

  return (
    <DraftLessonTestEditor
      courseId={courseId}
      descriptiveTags={descriptiveTags}
      initialSharedTest={lessonTestDraftQuery.data ?? null}
      initialTitle={lessonTitle || "Test"}
      lessonId={lessonId!}
      reportAutosaveStatus={reportAutosaveStatus}
      sectionId={lessonSectionId!}
      selectedNode={selectedNode}
      supportedLocales={supportedLocales}
    />
  );
}

function DraftStandaloneTestEditor({
  courseId,
  descriptiveTags,
  initialSharedTest,
  reportAutosaveStatus,
  sectionId,
  selectedNode,
  supportedLocales,
}: {
  courseId: string;
  descriptiveTags: CourseTagDefinition[];
  initialSharedTest: SharedTestDefinition | null;
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  sectionId: string;
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
}) {
  const [seed] = useState<TestEditorState>(() =>
    initialSharedTest
      ? fromSharedTestDefinition(initialSharedTest, supportedLocales)
      : createInitialState(supportedLocales, selectedNode.title),
  );
  const [testState, setTestState] = useState<TestEditorState>(seed);
  const saveSectionTestMutation = useSaveSectionTestMutation();

  const buildInput = useCallback(
    (state: TestEditorState): SaveSectionTestInput => ({
      courseId,
      sectionId,
      test: toPersistableSharedTestDefinition(state, descriptiveTags),
      testId: selectedNode.id,
    }),
    [courseId, descriptiveTags, sectionId, selectedNode.id],
  );

  const autosave = useEntityAutosave({
    buildInput,
    initialValue: seed,
    mutation: saveSectionTestMutation,
    value: testState,
  });

  useForwardAutosaveStatus(reportAutosaveStatus, autosave);

  // Unlike a lesson-attached test, a standalone test's own file does carry a
  // real title (selectedNode.title, sourced from CourseSectionTest) — but
  // SharedTestDefinition still has no title field, so an edit made inside
  // TestEditorPrototype's own title input doesn't round-trip on save any
  // more than it does for a lesson-attached test today.
  return (
    <TestEditorPrototype
      courseId={courseId}
      descriptiveTags={descriptiveTags}
      initialState={testState}
      initialTitle={selectedNode.title}
      onStateChange={setTestState}
      selectedNode={selectedNode}
      supportedLocales={supportedLocales}
    />
  );
}

function DraftLessonTestEditor({
  courseId,
  descriptiveTags,
  initialSharedTest,
  initialTitle,
  lessonId,
  reportAutosaveStatus,
  sectionId,
  selectedNode,
  supportedLocales,
}: {
  courseId: string;
  descriptiveTags: CourseTagDefinition[];
  initialSharedTest: SharedTestDefinition | null;
  initialTitle: string;
  lessonId: string;
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  sectionId: string;
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
}) {
  const [seed] = useState<TestEditorState>(() =>
    initialSharedTest
      ? fromSharedTestDefinition(initialSharedTest, supportedLocales)
      : createInitialState(supportedLocales, initialTitle),
  );
  const [testState, setTestState] = useState<TestEditorState>(seed);
  const saveLessonTestMutation = useSaveLessonTestMutation();

  const buildInput = useCallback(
    (state: TestEditorState): SaveLessonTestInput => ({
      courseId,
      lessonId,
      sectionId,
      test: toPersistableSharedTestDefinition(state, descriptiveTags),
    }),
    [courseId, descriptiveTags, lessonId, sectionId],
  );

  const autosave = useEntityAutosave({
    buildInput,
    initialValue: seed,
    mutation: saveLessonTestMutation,
    value: testState,
  });

  useForwardAutosaveStatus(reportAutosaveStatus, autosave);

  return (
    <TestEditorPrototype
      courseId={courseId}
      descriptiveTags={descriptiveTags}
      initialState={testState}
      initialTitle={initialTitle}
      onStateChange={setTestState}
      selectedNode={selectedNode}
      supportedLocales={supportedLocales}
    />
  );
}

function DraftSectionEditor({
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

  useForwardAutosaveStatus(reportAutosaveStatus, autosave);

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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>Section</Eyebrow>
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
                    <FieldLabel htmlFor={`draft-section-description-${locale}`}>
                      Description
                    </FieldLabel>
                    <Textarea
                      id={`draft-section-description-${locale}`}
                      onChange={(event) =>
                        updateLocale(locale, { description: event.target.value })
                      }
                      placeholder="Add a short section description"
                      rows={3}
                      value={locales[locale]?.description ?? ""}
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

function DraftDocumentEditor({
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
