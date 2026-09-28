import { BookOpen, FileText, FlaskConical, Folder } from "lucide-react";

import {
  courseRootId,
  type StructureSelection,
} from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { PageBreadcrumb } from "@/components/page/page-breadcrumbs";
import type { CourseSectionPreview } from "@/lib/course-package";
import { resolveTestIdForLesson } from "@/lib/course-test-id";

// The course editor's trail, following the explorer selection:
// My courses › Course › Section › Lesson › Test. Every crumb but the last
// selects that node in the explorer (the editor is one route; its "pages" are
// explorer selections, so crumbs select rather than navigate).
export function buildEditorBreadcrumbs({
  courseTitle,
  myCoursesLabel,
  onSelect,
  sections,
  selectedNode,
  testLabel,
}: {
  courseTitle: string;
  myCoursesLabel: string;
  onSelect: (selection: StructureSelection) => void;
  sections: readonly CourseSectionPreview[];
  selectedNode: StructureSelection;
  testLabel: string;
}): PageBreadcrumb[] {
  const crumbs: PageBreadcrumb[] = [
    { icon: BookOpen, label: myCoursesLabel, to: "/my-courses" },
    {
      icon: Folder,
      label: courseTitle,
      onSelect: () => onSelect({ id: courseRootId, title: courseTitle, type: "course" }),
    },
  ];

  if (selectedNode.id === courseRootId) {
    return crumbs;
  }

  for (const section of sections) {
    const sectionCrumb: PageBreadcrumb = {
      icon: Folder,
      label: section.title,
      onSelect: () => onSelect({ id: section.id, title: section.title, type: "section" }),
    };

    if (section.id === selectedNode.id) {
      return [...crumbs, sectionCrumb];
    }

    for (const lesson of section.lessons) {
      const lessonCrumb: PageBreadcrumb = {
        icon: FileText,
        label: lesson.title,
        onSelect: () => onSelect({ id: lesson.id, title: lesson.title, type: "document" }),
      };

      if (lesson.id === selectedNode.id) {
        return [...crumbs, sectionCrumb, lessonCrumb];
      }

      if (resolveTestIdForLesson(lesson.id) === selectedNode.id) {
        return [...crumbs, sectionCrumb, lessonCrumb, { icon: FlaskConical, label: testLabel }];
      }
    }

    const standaloneTest = section.tests.find((test) => test.id === selectedNode.id);

    if (standaloneTest) {
      return [...crumbs, sectionCrumb, { icon: FlaskConical, label: standaloneTest.title }];
    }
  }

  // Not found (e.g. just created and not refetched yet): fall back to its own title.
  return [
    ...crumbs,
    {
      icon: selectedNode.type === "test" ? FlaskConical : selectedNode.type === "document" ? FileText : Folder,
      label: selectedNode.title,
    },
  ];
}
