import type { Locale } from "@/lib/i18n";
import type { CourseVersionInfo } from "@/lib/course-versioning";

export type CourseStatus = "draft" | "published";
export type ContentRating = "all-ages" | "mature-themes" | "explicit";

export type CourseManifest = {
  builtin: boolean;
  contentRating: ContentRating;
  defaultLocale: Locale;
  id: string;
  locales: Record<Locale, LocalizedCourseMetadata>;
  slug: string;
  status: CourseStatus;
  supportedLocales: Locale[];
  version: string;
  versionInfo?: CourseVersionInfo;
};

export type LocalizedCourseMetadata = {
  description: string;
  title: string;
};

export type LocalizedLessonMetadata = {
  description: string;
  title: string;
};

export type LocalizedSectionMetadata = {
  description?: string;
  title: string;
};

export type CourseExerciseVariable = {
  max: number;
  min: number;
  type: "integer";
};

export type CourseExerciseSolutionSpace = number | "sm" | "md" | "lg" | "xl";

export type CourseExercise = {
  hint?: string;
  id: string;
  precision: number;
  prompt: string;
  solutionSpace: CourseExerciseSolutionSpace;
  tags: string[];
  variables: Record<string, CourseExerciseVariable>;
  formula: string;
};

export type CourseTestStructureRule = {
  count: number;
  tag: string;
};

export type CourseTest = {
  exercises: CourseExercise[];
  id: string;
  structure?: CourseTestStructureRule[];
};

export type LessonPreview = {
  description: string;
  id: string;
  iconUrl: string | null;
  title: string;
};

export type CoursePreviewItem = {
  iconUrl: string | null;
  id: string;
  kind: "lesson" | "test";
  title: string;
};

export type CourseLesson = LessonPreview & {
  body: string;
  test: CourseTest | null;
};

export type CourseSectionPreview = {
  description?: string;
  id: string;
  lessons: CourseLesson[];
  title: string;
};

export type StoredSectionDefinition = {
  id: string;
  locales: Record<Locale, LocalizedSectionMetadata>;
  slug: string;
};

export type CourseSummary = {
  contentRating: ContentRating;
  defaultLocale: Locale;
  description: string;
  id: string;
  lessonPreviews: LessonPreview[];
  previewItems: CoursePreviewItem[];
  status: CourseStatus;
  supportedLocales: Locale[];
  title: string;
  version: string;
};

export type CourseDetails = CourseSummary & {
  builtin: boolean;
  entrySectionId: string | null;
  lessonIds: string[];
  sections: CourseSectionPreview[];
  sectionIds: string[];
  slug: string;
};

export type CreateCourseDraftInput = {
  defaultLocale: Locale;
  deriveSrCyrlFromSr?: boolean;
  locales: Partial<Record<Locale, LocalizedCourseMetadata>>;
  supportedLocales: Locale[];
};

export type CreateCourseDraftResult = {
  courseId: string;
};

export type CreateCourseSectionInput = {
  courseId: string;
  description?: string;
  title: string;
};

export type CreateCourseSectionResult = {
  sectionId: string;
};

export type UpdateCourseDraftMetadataInput = {
  contentRating: ContentRating;
  courseId: string;
  description: string;
  supportedLocales: Locale[];
  title: string;
};
