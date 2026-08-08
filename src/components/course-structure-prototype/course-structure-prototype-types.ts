type StructureNodeType = "course" | "document" | "section" | "test";

type StructureSelection = {
  id: string;
  title: string;
  type: StructureNodeType;
};

const courseRootId = "course-root";

export { courseRootId };
export type { StructureSelection, StructureNodeType };
