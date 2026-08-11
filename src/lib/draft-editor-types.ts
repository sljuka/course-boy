import type { TestEditorState } from "@/components/test-editor-prototype-types";
import type { ContentRating } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import type { CourseTagDefinition } from "@/lib/course-tags";

type DraftDocumentDraft = {
  subtitle: string;
  title: string;
};

type DraftEditorSnapshot = {
  contentRating: ContentRating;
  courseDescription: string;
  courseId: string;
  descriptiveTags: CourseTagDefinition[];
  courseTitle: string;
  documentDrafts: Record<string, DraftDocumentDraft>;
  supportedLocales: Locale[];
  testDrafts: Record<string, TestEditorState>;
  version: 1;
};

type DraftEditorRecord = {
  savedAt: string;
  snapshot: DraftEditorSnapshot;
};

export type {
  ContentRating,
  DraftDocumentDraft,
  DraftEditorRecord,
  DraftEditorSnapshot,
};
