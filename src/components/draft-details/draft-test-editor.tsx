import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getLocaleLabel } from "@/components/draft-details/draft-locale-utils";
import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { CourseLayoutOutletContext } from "@/components/course-layout";
import { LocalesTabs } from "@/components/locales-tabs";
import { PageContent } from "@/components/page-content";
import { TestEditorPrototype } from "@/components/test-editor-prototype";
import { createInitialState } from "@/components/test-editor-prototype-logic";
import {
  fromSharedTestDefinition,
  toSharedTestDefinition,
} from "@/components/test-editor-prototype-persistence";
import type { TestEditorState } from "@/components/test-editor-prototype-types";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  CourseSectionPreview,
  LocalizedSectionMetadata,
  SaveLessonTestInput,
  SaveSectionTestInput,
  SharedTestDefinition,
  UpdateCourseSectionTestMetadataInput,
} from "@/lib/course-package";
import {
  normalizeCourseTagLabel,
  type CourseTagDefinition,
} from "@/lib/course-tags";
import type { Locale } from "@/lib/i18n";
import {
  useLessonTestDraftQuery,
  useSaveLessonTestMutation,
  useSaveSectionTestMutation,
  useSectionTestDraftQuery,
  useUpdateSectionTestMetadataMutation,
} from "@/lib/course-queries";
import { resolveLessonIdForTest } from "@/lib/course-test-id";
import {
  type EntityAutosaveStatus,
  useEntityAutosave,
  useForwardAutosaveStatus,
} from "@/lib/use-entity-autosave";

function isTestTitleValid(title: string | undefined): boolean {
  return (title?.trim().length ?? 0) > 0;
}

function getTestTitleValidationMessage(
  locale: Locale,
  title: string | undefined,
) {
  if (!isTestTitleValid(title)) {
    return `Test title for ${locale} is required.`;
  }

  return null;
}

function buildTestLocales(
  locales: Record<Locale, LocalizedSectionMetadata> | undefined,
): Partial<Record<Locale, string>> {
  if (!locales) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(locales).map(([locale, metadata]) => [
      locale,
      metadata.title,
    ]),
  );
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
      ? {
          structure: shared.structure.filter((rule) =>
            registeredTagIds.has(rule.tag),
          ),
        }
      : {}),
  };
}

// A selected "test" node is either a standalone CourseSectionTest (its id is
// found directly in some section's `tests`) or a lesson-attached test (its
// id is derived from a lesson id via resolveLessonIdForTest) — these are two
// different persisted things with different save/draft plumbing.
export function DraftTestEditor({
  courseId,
  courseSections,
  defaultLocale,
  descriptiveTags,
  reportAutosaveStatus,
  selectedNode,
  setSelectedNode,
  supportedLocales,
}: {
  courseId: string;
  courseSections: CourseSectionPreview[];
  defaultLocale: Locale;
  descriptiveTags: CourseTagDefinition[];
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  selectedNode: StructureSelection;
  setSelectedNode: (selection: StructureSelection) => void;
  supportedLocales: Locale[];
}) {
  const standaloneSection = courseSections.find((section) =>
    section.tests.some((test) => test.id === selectedNode.id),
  );
  const standaloneSectionId = standaloneSection?.id ?? null;
  const isStandalone = standaloneSectionId !== null;
  const lessonId = isStandalone
    ? null
    : resolveLessonIdForTest(selectedNode.id);
  const lessonSectionId = lessonId
    ? (courseSections.find((section) =>
        section.lessons.some((lesson) => lesson.id === lessonId),
      )?.id ?? null)
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
  const activeQuery = isStandalone
    ? sectionTestDraftQuery
    : lessonTestDraftQuery;

  // `isFetching` (not just `isLoading`) matters here: a fresh mount of this
  // page (e.g. returning from the "Preview test" route) can find this query
  // already cached from earlier in the session but stale — invalidated once
  // this test's own autosave landed — which would otherwise serve the *old*
  // cached value instantly while a refetch runs in the background. This no
  // longer fires on every save: `useSaveSectionTestMutation`/
  // `useSaveLessonTestMutation` write the just-saved value straight into
  // this same query's cache instead of invalidating it, so a normal save
  // never flips `isFetching` at all — only a real stale-cache reconciliation
  // (e.g. after that unmount-triggered flush race) does.
  if (activeQuery.isLoading || activeQuery.isFetching) {
    return <PageContent>{null}</PageContent>;
  }

  if (isStandalone) {
    const test = standaloneSection?.tests.find(
      (candidate) => candidate.id === selectedNode.id,
    );

    return (
      <DraftStandaloneTestEditor
        courseId={courseId}
        defaultLocale={defaultLocale}
        descriptiveTags={descriptiveTags}
        initialLocales={test?.locales}
        initialSharedTest={sectionTestDraftQuery.data ?? null}
        reportAutosaveStatus={reportAutosaveStatus}
        sectionId={standaloneSectionId!}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        supportedLocales={supportedLocales}
      />
    );
  }

  return (
    <DraftLessonTestEditor
      courseId={courseId}
      descriptiveTags={descriptiveTags}
      initialSharedTest={lessonTestDraftQuery.data ?? null}
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
  defaultLocale,
  descriptiveTags,
  initialLocales,
  initialSharedTest,
  reportAutosaveStatus,
  sectionId,
  selectedNode,
  setSelectedNode,
  supportedLocales,
}: {
  courseId: string;
  defaultLocale: Locale;
  descriptiveTags: CourseTagDefinition[];
  initialLocales: Record<Locale, LocalizedSectionMetadata> | undefined;
  initialSharedTest: SharedTestDefinition | null;
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  sectionId: string;
  selectedNode: StructureSelection;
  setSelectedNode: (selection: StructureSelection) => void;
  supportedLocales: Locale[];
}) {
  const { t } = useTranslation();
  const [seed] = useState<TestEditorState>(() =>
    initialSharedTest
      ? fromSharedTestDefinition(initialSharedTest, supportedLocales)
      : createInitialState(supportedLocales),
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

  const [titleSeed] = useState(() => buildTestLocales(initialLocales));
  const [titleLocales, setTitleLocales] = useState(titleSeed);
  const [activeTitleLocale, setActiveTitleLocale] =
    useState<Locale>(defaultLocale);
  const updateSectionTestMetadataMutation =
    useUpdateSectionTestMetadataMutation();

  useEffect(() => {
    if (supportedLocales.includes(activeTitleLocale)) {
      return;
    }

    setActiveTitleLocale(defaultLocale);
  }, [activeTitleLocale, defaultLocale, supportedLocales]);

  // The on-disk test file requires every locale's `description` to stay a
  // defined string (see `isStoredSectionTestDefinition` in
  // electron/course-registry.ts) even though this editor only ever changes
  // `title` — preserve whatever the section originally had (or "") rather
  // than omitting it, or a save here would corrupt the file for every other
  // reader.
  const buildTitleInput = useCallback(
    (value: typeof titleSeed): UpdateCourseSectionTestMetadataInput => ({
      courseId,
      locales: Object.fromEntries(
        Object.entries(value).map(([locale, title]) => [
          locale,
          {
            description: initialLocales?.[locale as Locale]?.description ?? "",
            title: title ?? "",
          },
        ]),
      ) as Partial<Record<Locale, LocalizedSectionMetadata>>,
      sectionId,
      testId: selectedNode.id,
    }),
    [courseId, initialLocales, sectionId, selectedNode.id],
  );

  const titleAutosave = useEntityAutosave({
    buildInput: buildTitleInput,
    initialValue: titleSeed,
    mutation: updateSectionTestMetadataMutation,
    value: titleLocales,
  });

  // Two independent autosaves (content + title metadata) share one status
  // indicator, so combine them rather than calling useForwardAutosaveStatus
  // twice — two separate reporters would race and overwrite each other.
  const combinedStatus: EntityAutosaveStatus =
    autosave.status === "error" || titleAutosave.status === "error"
      ? "error"
      : autosave.status === "saving" || titleAutosave.status === "saving"
        ? "saving"
        : autosave.status === "dirty" || titleAutosave.status === "dirty"
          ? "dirty"
          : "saved";
  const combinedSaveNow = useCallback(() => {
    autosave.saveNow();
    titleAutosave.saveNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosave.saveNow, titleAutosave.saveNow]);

  useForwardAutosaveStatus(reportAutosaveStatus, {
    errorMessage: autosave.errorMessage ?? titleAutosave.errorMessage,
    saveNow: combinedSaveNow,
    status: combinedStatus,
  });

  function updateTitleLocale(locale: Locale, title: string) {
    setTitleLocales((current) => ({ ...current, [locale]: title }));

    if (locale === defaultLocale) {
      setSelectedNode({ ...selectedNode, title });
    }
  }

  const titleEditor = (
    <LocalesTabs
      activeLocale={activeTitleLocale}
      getIsIncomplete={(locale) => !isTestTitleValid(titleLocales[locale])}
      locales={supportedLocales}
      onActiveLocaleChange={setActiveTitleLocale}
      renderContent={(locale) => (
        <FieldSet>
          <FieldLegend className="sr-only">
            {getLocaleLabel(locale, t)}
          </FieldLegend>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`draft-test-title-${locale}`}>
                Test title
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </FieldLabel>
              <Input
                aria-invalid={!isTestTitleValid(titleLocales[locale])}
                id={`draft-test-title-${locale}`}
                onChange={(event) =>
                  updateTitleLocale(locale, event.target.value)
                }
                placeholder="Test title"
                value={titleLocales[locale] ?? ""}
              />
              {getTestTitleValidationMessage(locale, titleLocales[locale]) && (
                <FieldDescription variant="destructive">
                  {getTestTitleValidationMessage(locale, titleLocales[locale])}
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </FieldSet>
      )}
    />
  );

  return (
    <TestEditorPrototype
      courseId={courseId}
      descriptiveTags={descriptiveTags}
      initialState={testState}
      isStandalone
      onStateChange={setTestState}
      selectedNode={selectedNode}
      supportedLocales={supportedLocales}
      titleEditor={titleEditor}
    />
  );
}

function DraftLessonTestEditor({
  courseId,
  descriptiveTags,
  initialSharedTest,
  lessonId,
  reportAutosaveStatus,
  sectionId,
  selectedNode,
  supportedLocales,
}: {
  courseId: string;
  descriptiveTags: CourseTagDefinition[];
  initialSharedTest: SharedTestDefinition | null;
  lessonId: string;
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  sectionId: string;
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
}) {
  const [seed] = useState<TestEditorState>(() =>
    initialSharedTest
      ? fromSharedTestDefinition(initialSharedTest, supportedLocales)
      : createInitialState(supportedLocales),
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
      isStandalone={false}
      onStateChange={setTestState}
      selectedNode={selectedNode}
      supportedLocales={supportedLocales}
    />
  );
}
