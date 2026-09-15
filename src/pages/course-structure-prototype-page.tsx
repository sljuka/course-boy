import { PageContent } from "@/components/page-content";
import { CourseStructurePrototype } from "@/components/course-structure-prototype/course-structure-prototype";
import type { CourseSectionPreview } from "@/lib/course-package";

function createSampleLesson(id: string, title: string): CourseSectionPreview["lessons"][number] {
  return {
    body: "",
    description: "",
    iconUrl: null,
    id,
    test: null,
    title,
  };
}

function createSampleLocales(title: string): CourseSectionPreview["locales"] {
  return {
    en: { description: "", title },
    sr: { description: "", title },
    "sr-Cyrl": { description: "", title },
  };
}

const sampleSections: CourseSectionPreview[] = [
  {
    id: "sample-section-1",
    lessons: [
      createSampleLesson("sample-lesson-1", "Placeholder document A"),
      createSampleLesson("sample-lesson-2", "Placeholder document B"),
    ],
    locales: createSampleLocales("Section 1"),
    tests: [],
    title: "Section 1",
  },
  {
    id: "sample-section-2",
    lessons: [createSampleLesson("sample-lesson-3", "Placeholder document C")],
    locales: createSampleLocales("Section 2"),
    tests: [],
    title: "Section 2",
  },
];

export function CourseStructurePrototypePage() {
  return (
    <PageContent>
      <CourseStructurePrototype
        courseId="sample-course"
        courseTitle="Sample course"
        sections={sampleSections}
      />
    </PageContent>
  );
}
