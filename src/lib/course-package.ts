import type { Locale } from "@/lib/i18n";
import type { CourseAssetKind } from "@/lib/course-asset-id";
import type { CourseTagDefinition } from "@/lib/course-tags";
import type { CourseVersionInfo } from "@/lib/course-versioning";

export type CourseStatus = "draft" | "published";
export type ContentRating = "all-ages" | "mature-themes" | "explicit";

export type CourseManifest = {
  builtin: boolean;
  contentRating: ContentRating;
  defaultLocale: Locale;
  descriptiveTags?: CourseTagDefinition[];
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
  parity?: "even" | "odd";
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

/**
 * On-disk shape of a `test-XX-slug.json` file — the canonical, all-locales
 * form. `readLessonTest` collapses this to a single-locale `CourseTest` for
 * the player; the draft editor needs this richer shape directly.
 */
export type SharedTestExerciseDefinition = {
  locales: Partial<Record<Locale, { hint?: string; prompt: string }>>;
  solution: {
    formula: string;
    precision: number;
    space?: CourseExerciseSolutionSpace;
  };
  tags: string[];
  variables: Record<string, CourseExerciseVariable>;
};

export type SharedTestDefinition = {
  exercises: SharedTestExerciseDefinition[];
  structure?: CourseTestStructureRule[];
  template: string;
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
  locales: Record<Locale, LocalizedSectionMetadata>;
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
  descriptiveTags: CourseTagDefinition[];
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
  locales: Record<Locale, LocalizedCourseMetadata>;
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

export type CreateCourseLessonInput = {
  courseId: string;
  description?: string;
  sectionId: string;
  title: string;
};

export type CreateCourseLessonResult = {
  lessonId: string;
};

export type UpdateLessonContentInput = {
  courseId: string;
  lessonId: string;
  locales: Partial<Record<Locale, { body: string }>>;
  sectionId: string;
};

export type SaveLessonTestInput = {
  courseId: string;
  lessonId: string;
  sectionId: string;
  test: SharedTestDefinition;
};

export type GetLessonTestDraftInput = {
  courseId: string;
  lessonId: string;
  sectionId: string;
};

export type UpdateCourseDraftMetadataInput = {
  contentRating: ContentRating;
  courseId: string;
  defaultLocale: Locale;
  descriptiveTags: CourseTagDefinition[];
  locales: Partial<Record<Locale, LocalizedCourseMetadata>>;
  supportedLocales: Locale[];
};

export type UploadCourseAssetInput = {
  courseId: string;
  kind: CourseAssetKind;
};

export type UploadCourseAssetResult = {
  mimeType: string;
  path: string;
} | null;
