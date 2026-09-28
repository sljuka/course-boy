import { describe, expect, it, vi } from "vitest";

import { courseRootId } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { CourseSectionPreview } from "@/lib/course-package";

import { buildEditorBreadcrumbs } from "./editor-breadcrumbs";

const sections = [
  {
    id: "section-01-algebra",
    lessons: [{ id: "lesson-01-polynomials", title: "Polynomials" }],
    tests: [{ id: "section-test-01-quiz", title: "Quiz" }],
    title: "Algebra",
  },
] as unknown as CourseSectionPreview[];

function build(selectedNode: { id: string; title: string; type: "course" | "document" | "section" | "test" }) {
  const onSelect = vi.fn();
  const crumbs = buildEditorBreadcrumbs({
    courseTitle: "Polinomi",
    myCoursesLabel: "My courses",
    onSelect,
    sections,
    selectedNode,
    testLabel: "Test",
  });

  return { crumbs, labels: crumbs.map((crumb) => crumb.label), onSelect };
}

describe("buildEditorBreadcrumbs", () => {
  it("ends at the course when the course root is selected", () => {
    expect(build({ id: courseRootId, title: "Polinomi", type: "course" }).labels).toEqual([
      "My courses",
      "Polinomi",
    ]);
  });

  it("walks section › lesson › lesson test", () => {
    expect(build({ id: "section-01-algebra", title: "Algebra", type: "section" }).labels).toEqual([
      "My courses",
      "Polinomi",
      "Algebra",
    ]);
    expect(
      build({ id: "lesson-01-polynomials", title: "Polynomials", type: "document" }).labels,
    ).toEqual(["My courses", "Polinomi", "Algebra", "Polynomials"]);
    expect(build({ id: "test-01-polynomials", title: "Test", type: "test" }).labels).toEqual([
      "My courses",
      "Polinomi",
      "Algebra",
      "Polynomials",
      "Test",
    ]);
  });

  it("puts a standalone section test directly under its section", () => {
    expect(build({ id: "section-test-01-quiz", title: "Quiz", type: "test" }).labels).toEqual([
      "My courses",
      "Polinomi",
      "Algebra",
      "Quiz",
    ]);
  });

  it("makes earlier crumbs select their explorer node", () => {
    const { crumbs, onSelect } = build({
      id: "lesson-01-polynomials",
      title: "Polynomials",
      type: "document",
    });

    expect(crumbs[0].to).toBe("/my-courses");
    crumbs[2].onSelect?.();

    expect(onSelect).toHaveBeenCalledWith({
      id: "section-01-algebra",
      title: "Algebra",
      type: "section",
    });
  });
});
