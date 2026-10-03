import type { ContentRating, CourseDetails } from "@/lib/course-package";

const contentRatingLabelKeys: Record<ContentRating, string> = {
  "all-ages": "allAges",
  explicit: "explicit",
  "mature-themes": "matureThemes",
};

export function getContentRatingLabelKey(contentRating: ContentRating) {
  return contentRatingLabelKeys[contentRating];
}

// A section intro (SLJ-45) is a player step shown like a lesson (no test of
// its own) under this id, reached through the lesson route.
const INTRO_STEP_PREFIX = "intro-";

export function introStepId(sectionId: string): string {
  return `${INTRO_STEP_PREFIX}${sectionId}`;
}

export function getEntryStep(
  course: CourseDetails,
): { id: string; kind: "lesson" | "test" } | null {
  const entrySection = course.sections.find(
    (section) => section.id === course.entrySectionId,
  );
  const fallbackSection = course.sections[0];
  const introSection = entrySection ?? fallbackSection;

  if (introSection?.intro) {
    return { id: introStepId(introSection.id), kind: "lesson" };
  }
  const lessonId = entrySection?.lessons[0]?.id ?? fallbackSection?.lessons[0]?.id;

  if (lessonId) {
    return { id: lessonId, kind: "lesson" };
  }

  const testId = entrySection?.tests[0]?.id ?? fallbackSection?.tests[0]?.id;

  return testId ? { id: testId, kind: "test" } : null;
}

export function buildLessonPath(courseId: string, lessonId: string) {
  return `/courses/${courseId}/lessons/${lessonId}`;
}

export function buildLessonTestPath(courseId: string, lessonId: string) {
  return `${buildLessonPath(courseId, lessonId)}/test`;
}

export function buildDraftTestPreviewPath(courseId: string) {
  return `/drafts/${courseId}/preview-test`;
}

export function buildDraftLessonPreviewPath(courseId: string) {
  return `/drafts/${courseId}/preview-lesson`;
}
