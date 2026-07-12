import type { Locale } from "@/lib/i18n";

export type CourseManifest = {
  courseType: string;
  defaultLocale: Locale;
  id: string;
  localesPath: string;
  sharedIndex: string;
  sharedPath: string;
  supportedLocales: Locale[];
  version: string;
};

export type SharedCourseIndex = {
  entryLessonId: string;
  id: string;
  lessonIds: string[];
  slug: string;
  templateIds: Record<string, string>;
};

export type LocalizedCourseMetadata = {
  description: string;
  title: string;
};

export type LessonPreview = {
  id: string;
  iconUrl: string | null;
  title: string;
};

export type CourseSummary = {
  defaultLocale: Locale;
  description: string;
  id: string;
  lessonPreviews: LessonPreview[];
  supportedLocales: Locale[];
  title: string;
  version: string;
};

export type CourseDetails = CourseSummary & {
  courseType: string;
  entryLessonId: string;
  lessonIds: string[];
  slug: string;
  templateIds: Record<string, string>;
};
