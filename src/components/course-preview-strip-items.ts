import type { CoursePreviewItem, CourseSectionPreview } from "@/lib/course-package";

export type CoursePreviewStripItem = CoursePreviewItem & {
  targetLessonId?: string;
};

export function buildSectionPreviewItems(
  lessons: CourseSectionPreview["lessons"],
): CoursePreviewStripItem[] {
  return lessons.flatMap((lesson) => [
    {
      iconUrl: lesson.iconUrl,
      id: lesson.id,
      kind: "lesson" as const,
      targetLessonId: lesson.id,
      title: lesson.title,
    },
    ...(lesson.test
      ? [
          {
            iconUrl: null,
            id: lesson.test.id,
            kind: "test" as const,
            targetLessonId: lesson.id,
            title: lesson.test.id,
          },
        ]
      : []),
  ]);
}
