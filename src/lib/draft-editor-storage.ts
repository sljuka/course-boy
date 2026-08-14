import type {
  DraftDocumentDraft,
  DraftDocumentLocaleDraft,
  DraftEditorRecord,
  DraftEditorSnapshot,
  DraftSectionDraft,
} from "@/lib/draft-editor-types";
import { createInitialDocumentBlocks } from "@/components/editor-prototype/editor-prototype-types";
import type { LocalizedCourseMetadata } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { normalizeCourseTagLabel } from "@/lib/course-tags";

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
    return record as DraftEditorRecord;
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

export async function saveDraftEditorRecord(snapshot: DraftEditorSnapshot) {
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
