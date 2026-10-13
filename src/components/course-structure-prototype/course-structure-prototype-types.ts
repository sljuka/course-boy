type StructureNodeType = "course" | "document" | "section" | "test";

type StructureSelection = {
  id: string;
  // Set (to a fresh stamp) by the explorer's Rename: the node's editor
  // focuses its title field (useFocusTitleOnRename).
  renameRequest?: number;
  // Set by the explorer when it selects what was just added: as a drawer
  // (narrow windows) the explorer stays open, so the teacher sees the new
  // item where it went and can keep adding. Any other selection closes it.
  keepPanelOpen?: boolean;
  title: string;
  type: StructureNodeType;
};

const courseRootId = "course-root";

export { courseRootId };
export type { StructureSelection, StructureNodeType };
