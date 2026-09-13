import type { ContentRating, CourseDetails } from "@/lib/course-package";

const contentRatingLabelKeys: Record<ContentRating, string> = {
  "all-ages": "allAges",
  explicit: "explicit",
  "mature-themes": "matureThemes",
};

export function getContentRatingLabelKey(contentRating: ContentRating) {
  return contentRatingLabelKeys[contentRating];
}

export function getEntryLessonId(course: CourseDetails) {
  const entrySection = course.sections.find(
    (section) => section.id === course.entrySectionId,
  );

  return entrySection?.lessons[0]?.id ?? course.sections[0]?.lessons[0]?.id ?? null;
}

export function buildLessonPath(courseId: string, lessonId: string) {
  return `/courses/${courseId}/lessons/${lessonId}`;
}

export function buildLessonTestPath(courseId: string, lessonId: string) {
  return `${buildLessonPath(courseId, lessonId)}/test`;
}
