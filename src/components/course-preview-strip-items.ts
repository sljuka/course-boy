import type { CoursePreviewItem, CourseSectionPreview, CourseTest } from "@/lib/course-package";
import { introStepId } from "@/lib/course-utils";
import { type GradeBand, resolveGradeBands } from "@/lib/grade-bands";

export type CoursePreviewStripItem = CoursePreviewItem & {
  // A graded test's grade bands (SLJ-135), to colour its best score.
  gradeBands?: GradeBand[];
  targetLessonId?: string;
};

function testGradeBands(test: CourseTest | null, courseGradeBands: GradeBand[] | null | undefined) {
  return test?.graded ? { gradeBands: resolveGradeBands(test.gradeBands, courseGradeBands) } : {};
}

// A section's tiles on the course page: its intro first (titled
// `introTitle`, when the section has one), then lessons and their tests, then
// standalone tests.
export function buildSectionPreviewItems(
  section: Pick<CourseSectionPreview, "id" | "intro" | "lessons" | "tests">,
  { courseGradeBands, introTitle }: { courseGradeBands?: GradeBand[] | null; introTitle?: string } = {},
): CoursePreviewStripItem[] {
  const introItems =
    section.intro !== null && introTitle
      ? [{ iconUrl: null, id: introStepId(section.id), kind: "lesson" as const, title: introTitle }]
      : [];
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
            ...testGradeBands(lesson.test, courseGradeBands),
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
    ...testGradeBands(sectionTest.test, courseGradeBands),
    title: sectionTest.title,
  }));

  return [...introItems, ...lessonItems, ...sectionTestItems];
}
