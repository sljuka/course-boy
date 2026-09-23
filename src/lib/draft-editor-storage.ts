import type {
  DraftDocumentDraft,
  DraftDocumentLocaleDraft,
  DraftEditorRecord,
  DraftEditorSnapshot,
  DraftSectionDraft,
} from "@/lib/draft-editor-types";
import { createInitialDocumentBlocks } from "@/components/editor-prototype/editor-prototype-types";
import { toSharedTestDefinition } from "@/components/test-editor-prototype-persistence";
import type { TestEditorState } from "@/components/test-editor-prototype-types";
import type { CourseSectionPreview, LocalizedCourseMetadata } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { blocksToMarkdown } from "@/lib/lesson-content-markdown";
import { normalizeCourseTagLabel } from "@/lib/course-tags";
import { queryClient } from "@/lib/query-client";

type LegacyDraftEditorSnapshot = {
  contentRating: DraftEditorSnapshot["contentRating"];
  courseDescription: string;
  courseId: string;
  courseTitle: string;
  defaultLocale?: Locale;
  descriptiveTags: DraftEditorSnapshot["descriptiveTags"];
  documentDrafts:
    | Record<string, { subtitle: string; title: string }>
    | Record<string, DraftDocumentLocaleDraft>
    | DraftEditorSnapshot["documentDrafts"];
  sectionDrafts?: DraftEditorSnapshot["sectionDrafts"];
  sectionTestDrafts?: DraftEditorSnapshot["sectionTestDrafts"];
  supportedLocales: Locale[];
  testDrafts: DraftEditorSnapshot["testDrafts"];
  version: 1 | 2;
};

type LegacyDraftEditorRecord = {
  savedAt: string;
  snapshot: LegacyDraftEditorSnapshot;
};

type LegacyDocumentDrafts =
  | Record<string, DraftDocumentLocaleDraft>
  | Record<string, { subtitle: string; title: string }>
  | DraftEditorSnapshot["documentDrafts"];

function getDraftEditorStorageKey(courseId: string) {
  return `matko:draft-editor:${courseId}`;
}

function getDraftMetadataSignature(snapshot: DraftEditorSnapshot) {
  return JSON.stringify({
    contentRating: snapshot.contentRating,
    courseId: snapshot.courseId,
    defaultLocale: snapshot.defaultLocale,
    descriptiveTags: snapshot.descriptiveTags,
    localizedCourse: snapshot.localizedCourse,
    sectionDrafts: snapshot.sectionDrafts,
    supportedLocales: snapshot.supportedLocales,
  });
}

function createEmptyLocalizedCourseMetadata(): LocalizedCourseMetadata {
  return {
    description: "",
    title: "",
  };
}

function normalizeDraftEditorRecord(
  record: DraftEditorRecord | LegacyDraftEditorRecord,
): DraftEditorRecord {
  if ("localizedCourse" in record.snapshot) {
    // Older saved records predate `sectionTestDrafts` — default it rather
    // than let it stay `undefined` for a shape check that otherwise treats
    // this snapshot as already-current.
    return {
      ...record,
      snapshot: {
        ...record.snapshot,
        sectionTestDrafts: record.snapshot.sectionTestDrafts ?? {},
      },
    } as DraftEditorRecord;
  }

  const defaultLocale =
    record.snapshot.defaultLocale ?? record.snapshot.supportedLocales[0] ?? "en";

  return {
    savedAt: record.savedAt,
    snapshot: {
      contentRating: record.snapshot.contentRating,
      courseId: record.snapshot.courseId,
      defaultLocale,
      descriptiveTags: record.snapshot.descriptiveTags,
      documentDrafts: normalizeDocumentDrafts(
        record.snapshot.documentDrafts,
        defaultLocale,
      ),
      localizedCourse: {
        [defaultLocale]: {
          description: record.snapshot.courseDescription,
          title: record.snapshot.courseTitle,
        },
      },
      sectionDrafts: normalizeSectionDrafts(record.snapshot.sectionDrafts),
      sectionTestDrafts: record.snapshot.sectionTestDrafts ?? {},
      supportedLocales:
        record.snapshot.supportedLocales.length > 0
          ? record.snapshot.supportedLocales
          : [defaultLocale],
      testDrafts: record.snapshot.testDrafts,
      version: 2,
    },
  };
}

function normalizeLocalizedCourse(
  defaultLocale: Locale,
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>,
  supportedLocales: Locale[],
) {
  const nextLocalizedCourse = { ...localizedCourse };

  for (const locale of supportedLocales) {
    nextLocalizedCourse[locale] ??=
      locale === defaultLocale
        ? localizedCourse[defaultLocale] ?? createEmptyLocalizedCourseMetadata()
        : createEmptyLocalizedCourseMetadata();
  }

  return nextLocalizedCourse;
}

function normalizeDocumentDrafts(
  documentDrafts: LegacyDocumentDrafts,
  defaultLocale: Locale,
) {
  return Object.fromEntries(
    Object.entries(documentDrafts).map(([documentId, documentDraft]) => {
      if ("locales" in documentDraft) {
        return [documentId, documentDraft];
      }

      return [
        documentId,
        {
          locales: {
            [defaultLocale]: {
              blocks: createInitialDocumentBlocks(
                documentDraft.title || undefined,
                defaultLocale,
              ).map(
                (block, index) =>
                  block.type === "markdown" && documentDraft.subtitle.trim().length > 0 && index === 1
                    ? {
                        ...block,
                        source: documentDraft.subtitle,
                      }
                    : block,
              ),
            },
          },
        } satisfies DraftDocumentDraft,
      ];
    }),
  ) as Record<string, DraftDocumentDraft>;
}

function normalizeSectionDrafts(
  sectionDrafts: DraftEditorSnapshot["sectionDrafts"] | undefined,
) {
  return (sectionDrafts ?? {}) as Record<string, DraftSectionDraft>;
}

export async function loadDraftEditorRecord(courseId: string) {
  const storedValue = window.localStorage.getItem(getDraftEditorStorageKey(courseId));

  if (!storedValue) {
    return null;
  }

  const parsedValue = JSON.parse(storedValue) as
    | DraftEditorRecord
    | LegacyDraftEditorRecord;

  const normalizedRecord = normalizeDraftEditorRecord(parsedValue);
  const normalizedSnapshot = normalizedRecord.snapshot;

  return {
    ...normalizedRecord,
    snapshot: {
      ...normalizedSnapshot,
      documentDrafts: normalizeDocumentDrafts(
        normalizedSnapshot.documentDrafts,
        normalizedSnapshot.defaultLocale,
      ),
      localizedCourse: normalizeLocalizedCourse(
        normalizedSnapshot.defaultLocale,
        normalizedSnapshot.localizedCourse,
        normalizedSnapshot.supportedLocales,
      ),
      sectionDrafts: normalizeSectionDrafts(normalizedSnapshot.sectionDrafts),
    },
  };
}

function buildSectionIdByLessonId(courseSections: CourseSectionPreview[]) {
  const sectionIdByLessonId = new Map<string, string>();

  for (const section of courseSections) {
    for (const lesson of section.lessons) {
      sectionIdByLessonId.set(lesson.id, section.id);
    }
  }

  return sectionIdByLessonId;
}

function buildSectionIdBySectionTestId(courseSections: CourseSectionPreview[]) {
  const sectionIdBySectionTestId = new Map<string, string>();

  for (const section of courseSections) {
    for (const sectionTest of section.tests) {
      sectionIdBySectionTestId.set(sectionTest.id, section.id);
    }
  }

  return sectionIdBySectionTestId;
}

function diffAndDispatch<T>(
  previous: Record<string, T>,
  next: Record<string, T>,
  dispatch: (key: string, value: T) => Promise<void> | void,
): Promise<void>[] {
  return Object.entries(next)
    .filter(([key, value]) => JSON.stringify(previous[key]) !== JSON.stringify(value))
    .map(([key, value]) => (async () => dispatch(key, value))());
}

// A test file, once it exists, must have at least one exercise —
// `isSharedTestDefinition` (electron/course-registry.ts) rejects an empty
// `exercises` array outright. A freshly opened test (or one whose last
// exercise was just removed) is a valid *draft* state, just not one that can
// be written to disk yet — skip it rather than dispatching a save that's
// guaranteed to fail validation.
function hasSavableExercises(testState: TestEditorState) {
  return testState.exercises.length > 0;
}

function toMarkdownLocales(documentDraft: DraftDocumentDraft) {
  return Object.fromEntries(
    Object.entries(documentDraft.locales).map(([locale, localeDraft]) => [
      locale,
      { body: blocksToMarkdown(localeDraft!.blocks) },
    ]),
  );
}

export async function saveDraftEditorRecord(
  snapshot: DraftEditorSnapshot,
  context: { courseSections: CourseSectionPreview[] },
) {
  const previousRecord = await loadDraftEditorRecord(snapshot.courseId);
  const persistedDescriptiveTags = snapshot.descriptiveTags.filter(
    (tag) => normalizeCourseTagLabel(tag.label).length > 0,
  );

  if (
    !previousRecord ||
    getDraftMetadataSignature(previousRecord.snapshot) !==
      getDraftMetadataSignature(snapshot)
  ) {
    await window.courses.updateDraftMetadata({
      contentRating: snapshot.contentRating,
      courseId: snapshot.courseId,
      defaultLocale: snapshot.defaultLocale,
      descriptiveTags: persistedDescriptiveTags,
      locales: snapshot.localizedCourse,
      supportedLocales: snapshot.supportedLocales,
    });
  }

  const sectionIdByLessonId = buildSectionIdByLessonId(context.courseSections);
  const sectionIdBySectionTestId = buildSectionIdBySectionTestId(context.courseSections);
  const previousDocumentDrafts = previousRecord?.snapshot.documentDrafts ?? {};
  const previousTestDrafts = previousRecord?.snapshot.testDrafts ?? {};
  const previousSectionTestDrafts = previousRecord?.snapshot.sectionTestDrafts ?? {};

  await Promise.all([
    ...diffAndDispatch<DraftDocumentDraft>(
      previousDocumentDrafts,
      snapshot.documentDrafts,
      (lessonId, documentDraft) => {
        const sectionId = sectionIdByLessonId.get(lessonId);

        if (!sectionId) {
          return;
        }

        return window.courses.updateLessonContent({
          courseId: snapshot.courseId,
          lessonId,
          locales: toMarkdownLocales(documentDraft),
          sectionId,
        });
      },
    ),
    ...diffAndDispatch<TestEditorState>(
      previousTestDrafts,
      snapshot.testDrafts,
      async (lessonId, testState) => {
        const sectionId = sectionIdByLessonId.get(lessonId);

        if (!sectionId || !hasSavableExercises(testState)) {
          return;
        }

        await window.courses.saveLessonTest({
          courseId: snapshot.courseId,
          lessonId,
          sectionId,
          test: toSharedTestDefinition(testState),
        });

        // Without this, a fresh mount of the draft editor (e.g. returning
        // from the "Preview test" route, which unmounts and remounts it)
        // falls back to whatever this query cached the *first* time it was
        // read — which can predate exercises just autosaved here — instead
        // of the content this exact call just wrote to disk. React Query
        // never invalidates this on its own: this is a plain async function,
        // not a mutation hook wired to it, and `saveDraftEditorRecord` is
        // the only path that writes a test file at all.
        await queryClient.invalidateQueries({
          queryKey: ["courses", "lesson-test-draft", snapshot.courseId, lessonId],
        });
      },
    ),
    ...diffAndDispatch<TestEditorState>(
      previousSectionTestDrafts,
      snapshot.sectionTestDrafts,
      async (testId, testState) => {
        const sectionId = sectionIdBySectionTestId.get(testId);

        if (!sectionId || !hasSavableExercises(testState)) {
          return;
        }

        await window.courses.saveSectionTest({
          courseId: snapshot.courseId,
          sectionId,
          test: toSharedTestDefinition(testState),
          testId,
        });

        // See the matching comment in the lesson-test branch above.
        await queryClient.invalidateQueries({
          queryKey: ["courses", "section-test-draft", snapshot.courseId, testId],
        });
      },
    ),
  ]);

  const nextRecord: DraftEditorRecord = {
    savedAt: new Date().toISOString(),
    snapshot,
  };

  window.localStorage.setItem(
    getDraftEditorStorageKey(snapshot.courseId),
    JSON.stringify(nextRecord),
  );

  return nextRecord;
}
