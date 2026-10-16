import { describe, expect, it } from "vitest";

import type { CourseSectionPreview } from "@/lib/course-package";
import { editorNodeHref, findEditorNodeTitle, parseEditorNode } from "@/lib/editor-node";

const sections = [
  {
    id: "section-a",
    lessons: [
      { id: "lesson-one", test: { exercises: [] }, title: "One" },
      { id: "lesson-two", test: null, title: "Two" },
    ],
    tests: [{ id: "section-test-final", title: "Final" }],
    title: "Section A",
  },
] as unknown as CourseSectionPreview[];

// SLJ-12: the editor's selected node in its address.
describe("editor node address", () => {
  it("is the course root without a node, and round-trips a node", () => {
    expect(editorNodeHref("c1")).toBe("/drafts/c1");
    expect(editorNodeHref("c1", { id: "course-root", type: "course" })).toBe("/drafts/c1");
    const href = editorNodeHref("c1", { id: "lesson-one", type: "document" });
    expect(parseEditorNode(href.slice(href.indexOf("?")))).toEqual({ id: "lesson-one", type: "document" });
  });

  it("ignores what isn't a node", () => {
    expect(parseEditorNode("")).toBeNull();
    expect(parseEditorNode("?node=course:x")).toBeNull();
    expect(parseEditorNode("?node=document:")).toBeNull();
    expect(parseEditorNode("?node=document")).toBeNull();
  });

  it("titles sections, documents and both kinds of test, and nothing that's gone", () => {
    expect(findEditorNodeTitle(sections, { id: "section-a", type: "section" })).toBe("Section A");
    expect(findEditorNodeTitle(sections, { id: "lesson-two", type: "document" })).toBe("Two");
    expect(findEditorNodeTitle(sections, { id: "section-test-final", type: "test" })).toBe("Final");
    expect(findEditorNodeTitle(sections, { id: "test-one", type: "test" })).toBe("Test");
    expect(findEditorNodeTitle(sections, { id: "test-two", type: "test" })).toBeNull();
    expect(findEditorNodeTitle(sections, { id: "lesson-gone", type: "document" })).toBeNull();
  });
});
