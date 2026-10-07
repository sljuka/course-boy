type StructureNodeType = "course" | "document" | "section" | "test";

type StructureSelection = {
  id: string;
  // Set (to a fresh stamp) by the explorer's Rename: the node's editor
  // focuses its title field (useFocusTitleOnRename).
  renameRequest?: number;
  title: string;
  type: StructureNodeType;
};

const courseRootId = "course-root";

export { courseRootId };
export type { StructureSelection, StructureNodeType };
