import type { CourseSectionPreview } from "@/lib/course-package";
import { resolveLessonIdForTest } from "@/lib/course-test-id";

// Which node the course editor shows (SLJ-12): in its address, so a tab
// remembers it and "Open in new tab" on an explorer node opens that node.
// `/drafts/<course>` is the course root; `?node=<type>:<id>` anything else:
// a section, a document (lesson), a lesson's test or a section's own test.

export type EditorNodeType = "document" | "section" | "test";
export type EditorNodeRef = { id: string; type: EditorNodeType };

const NODE_TYPES = new Set<string>(["document", "section", "test"]);

export function editorNodeHref(courseId: string, node?: { id: string; type: string } | null): string {
  const base = `/drafts/${courseId}`;
  if (!node || !NODE_TYPES.has(node.type)) return base;
  return `${base}?node=${encodeURIComponent(`${node.type}:${node.id}`)}`;
}

export function parseEditorNode(search: string): EditorNodeRef | null {
  const value = new URLSearchParams(search).get("node");
  if (!value) return null;
  const at = value.indexOf(":");
  const type = value.slice(0, at);
  const id = value.slice(at + 1);
  return at > 0 && id && NODE_TYPES.has(type) ? { id, type: type as EditorNodeType } : null;
}

// The node's title in the course, or null when it isn't there (removed
// since). A lesson's test is "Test", as the explorer names it.
export function findEditorNodeTitle(sections: readonly CourseSectionPreview[], node: EditorNodeRef): string | null {
  for (const section of sections) {
    if (node.type === "section" && section.id === node.id) return section.title;
    if (node.type === "document") {
      const lesson = section.lessons.find((candidate) => candidate.id === node.id);
      if (lesson) return lesson.title;
    }
    if (node.type === "test") {
      const test = section.tests.find((candidate) => candidate.id === node.id);
      if (test) return test.title;
      const lesson = section.lessons.find((candidate) => candidate.id === resolveLessonIdForTest(node.id));
      if (lesson?.test) return "Test";
    }
  }
  return null;
}
