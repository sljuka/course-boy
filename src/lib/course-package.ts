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
  entrySectionId: string;
  id: string;
  sectionIds: string[];
  slug: string;
  templateIds: Record<string, string>;
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

export type CourseExercise = {
  hint?: string;
  id: string;
  precision: number;
  prompt: string;
  title: string;
  variables: Record<string, CourseExerciseVariable>;
  formula: string;
};

export type LessonPreview = {
  description: string;
  id: string;
  iconUrl: string | null;
  title: string;
};

export type CourseLesson = LessonPreview & {
  body: string;
  exercise: CourseExercise | null;
};

export type CourseSectionPreview = {
  description?: string;
  id: string;
  lessons: CourseLesson[];
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
  entrySectionId: string;
  lessonIds: string[];
  sections: CourseSectionPreview[];
  sectionIds: string[];
  slug: string;
  templateIds: Record<string, string>;
};
