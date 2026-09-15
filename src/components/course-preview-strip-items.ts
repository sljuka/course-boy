import type { CoursePreviewItem, CourseSectionPreview } from "@/lib/course-package";

export type CoursePreviewStripItem = CoursePreviewItem & {
  targetLessonId?: string;
};

export function buildSectionPreviewItems(
  section: Pick<CourseSectionPreview, "lessons" | "tests">,
): CoursePreviewStripItem[] {
  const lessonItems = section.lessons.flatMap((lesson) => [
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
  const sectionTestItems = section.tests.map((sectionTest) => ({
    iconUrl: sectionTest.iconUrl,
    id: sectionTest.id,
    kind: "test" as const,
    title: sectionTest.title,
  }));

  return [...lessonItems, ...sectionTestItems];
}
