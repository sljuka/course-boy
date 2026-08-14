import type { EditorPrototypeBlock } from "@/components/editor-prototype/editor-prototype-types";
import type { TestEditorState } from "@/components/test-editor-prototype-types";
import type {
  ContentRating,
  LocalizedCourseMetadata,
} from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import type { CourseTagDefinition } from "@/lib/course-tags";

type DraftDocumentLocaleDraft = {
  blocks: EditorPrototypeBlock[];
};

type DraftDocumentDraft = {
  locales: Partial<Record<Locale, DraftDocumentLocaleDraft>>;
};

type DraftSectionLocaleDraft = {
  description: string;
  title: string;
};

type DraftSectionDraft = {
  locales: Partial<Record<Locale, DraftSectionLocaleDraft>>;
};

type DraftEditorSnapshot = {
  contentRating: ContentRating;
  courseId: string;
  defaultLocale: Locale;
  descriptiveTags: CourseTagDefinition[];
  documentDrafts: Record<string, DraftDocumentDraft>;
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>;
  sectionDrafts: Record<string, DraftSectionDraft>;
  supportedLocales: Locale[];
  testDrafts: Record<string, TestEditorState>;
  version: 2;
};

type DraftEditorRecord = {
  savedAt: string;
  snapshot: DraftEditorSnapshot;
};

export type {
  ContentRating,
  DraftDocumentDraft,
  DraftDocumentLocaleDraft,
  DraftSectionDraft,
  DraftSectionLocaleDraft,
  DraftEditorRecord,
  DraftEditorSnapshot,
};
