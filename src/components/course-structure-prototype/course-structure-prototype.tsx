import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FilePenLine,
  FileText,
  FlaskConical,
  Folder,
  PanelRightOpen,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { CardDescription } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";

type DocumentNode = {
  id: string;
  title: string;
  type: "document";
};

type TestNode = {
  id: string;
  title: string;
  type: "test";
};

type SectionChildNode = DocumentNode | TestNode;

type SectionNode = {
  children: SectionChildNode[];
  id: string;
  title: string;
  type: "section";
};

type RootNode = DocumentNode | TestNode | SectionNode;
type RootNodeType = RootNode["type"];
type SectionChildNodeType = SectionChildNode["type"];

const nodeTypeLabels = {
  document: "Document",
  section: "Section",
  test: "Test",
} as const;

const nodeTypeIcons = {
  document: FileText,
  section: Folder,
  test: FlaskConical,
} as const;

const initialNodes: RootNode[] = [
  createRootNode("document", "README"),
  createRootNode("section", "Section 1", [
    createSectionChildNode("document", "Placeholder document A"),
    createSectionChildNode("document", "Placeholder document B"),
    createSectionChildNode("test", "Section 1 test"),
  ]),
  createRootNode("section", "Section 2", [
    createSectionChildNode("document", "Placeholder document C"),
    createSectionChildNode("test", "Section 2 test"),
  ]),
];

const courseRootTitle = "Course";

export function CourseStructurePrototype({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [nodes, setNodes] = useState<RootNode[]>(initialNodes);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isCourseRootExpanded, setIsCourseRootExpanded] = useState(true);
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>(
    initialNodes
      .filter((node): node is SectionNode => node.type === "section")
      .map((node) => node.id),
  );

  function updateRootNode(id: string, title: string) {
    setNodes((currentNodes) =>
      currentNodes.map((node) => (node.id === id ? { ...node, title } : node)),
    );
  }

  function updateSectionChild(sectionId: string, childId: string, title: string) {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.type !== "section" || node.id !== sectionId) {
          return node;
        }

        return {
          ...node,
          children: node.children.map((child) =>
            child.id === childId ? { ...child, title } : child,
          ),
        };
      }),
    );
  }

  function insertRootNode(type: RootNodeType, index = nodes.length) {
    const nextNode = createRootNode(type);
    setEditingNodeId(nextNode.id);
    setNodes((currentNodes) => {
      const nextNodes = [...currentNodes];
      nextNodes.splice(index, 0, nextNode);
      return nextNodes;
    });

    if (type === "section") {
      setExpandedSectionIds((currentIds) => [...currentIds, nextNode.id]);
    }
  }

  function insertSectionChild(
    sectionId: string,
    type: SectionChildNodeType,
    index: number,
  ) {
    const nextChild = createSectionChildNode(type);
    setEditingNodeId(nextChild.id);
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.type !== "section" || node.id !== sectionId) {
          return node;
        }

        const nextChildren = [...node.children];
        nextChildren.splice(index, 0, nextChild);

        return {
          ...node,
          children: nextChildren,
        };
      }),
    );
    setExpandedSectionIds((currentIds) =>
      currentIds.includes(sectionId) ? currentIds : [...currentIds, sectionId],
    );
  }

  function removeRootNode(id: string) {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== id));
    setExpandedSectionIds((currentIds) =>
      currentIds.filter((sectionId) => sectionId !== id),
    );
    setEditingNodeId((currentId) => (currentId === id ? null : currentId));
  }

  function removeSectionChild(sectionId: string, childId: string) {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.type !== "section" || node.id !== sectionId) {
          return node;
        }

        return {
          ...node,
          children: node.children.filter((child) => child.id !== childId),
        };
      }),
    );
    setEditingNodeId((currentId) => (currentId === childId ? null : currentId));
  }

  function moveRootNode(index: number, direction: -1 | 1) {
    setNodes((currentNodes) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= currentNodes.length) {
        return currentNodes;
      }

      const nextNodes = [...currentNodes];
      const [movedNode] = nextNodes.splice(index, 1);
      nextNodes.splice(nextIndex, 0, movedNode);
      return nextNodes;
    });
  }

  function moveSectionChild(sectionId: string, index: number, direction: -1 | 1) {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.type !== "section" || node.id !== sectionId) {
          return node;
        }

        const nextIndex = index + direction;

        if (nextIndex < 0 || nextIndex >= node.children.length) {
          return node;
        }

        const nextChildren = [...node.children];
        const [movedNode] = nextChildren.splice(index, 1);
        nextChildren.splice(nextIndex, 0, movedNode);

        return {
          ...node,
          children: nextChildren,
        };
      }),
    );
  }

  function toggleSection(sectionId: string) {
    setExpandedSectionIds((currentIds) =>
      currentIds.includes(sectionId)
        ? currentIds.filter((id) => id !== sectionId)
        : [...currentIds, sectionId],
    );
  }

  return (
    <div className={compact ? "flex flex-col gap-4" : "flex flex-col gap-8"}>
      {compact ? null : (
        <div className="space-y-3 border-b border-stone-200 pb-6">
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950">
            Prototype 2
          </h1>
          <CardDescription className="max-w-3xl text-base text-stone-700">
            Explore a course structure as a compact file tree with root
            documents, sections, and tests. Sections behave like folders, with
            context-menu actions for opening, renaming, ordering, and deleting
            nodes.
          </CardDescription>
        </div>
      )}

      <section className="overflow-hidden rounded-sm border border-stone-200 bg-white shadow-[0_12px_30px_-24px_rgba(28,25,23,0.35)]">
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Explorer
            </p>
            <p className={compact ? "text-xs text-stone-700" : "text-sm text-stone-700"}>
              Course structure
            </p>
          </div>
        </div>

        <div className={compact ? "p-1.5" : "p-2"}>
          <div className="space-y-0.5">
            <ExplorerRow
              canMoveDown={false}
              canMoveUp={false}
              icon={Folder}
              isExpanded={isCourseRootExpanded}
              isFixed
              label="Root"
              onInsertDocument={() => insertRootNode("document")}
              onInsertSection={() => insertRootNode("section")}
              onInsertTest={() => insertRootNode("test")}
              onMoveDown={() => {}}
              onMoveUp={() => {}}
              onToggle={() => setIsCourseRootExpanded((current) => !current)}
              title={courseRootTitle}
            />
            {isCourseRootExpanded ? (
              <div className="ml-3 border-l border-stone-200 pl-3">
                {nodes.length === 0 ? (
                  <div className="rounded-sm px-3 py-3 text-sm text-stone-500">
                    No course items yet. Right-click the root folder to add a
                    document, section, or test.
                  </div>
                ) : (
                  nodes.map((node, index) => (
                    <TreeNodeRow
                      editingNodeId={editingNodeId}
                      index={index}
                      key={node.id}
                      node={node}
                      onEditStart={setEditingNodeId}
                      onRootNodeChange={updateRootNode}
                      onRootNodeDelete={removeRootNode}
                      onRootNodeMove={moveRootNode}
                      onSectionChildChange={updateSectionChild}
                      onSectionChildDelete={removeSectionChild}
                      onSectionChildInsert={insertSectionChild}
                      onSectionChildMove={moveSectionChild}
                      onSectionToggle={toggleSection}
                      sectionIsExpanded={expandedSectionIds.includes(node.id)}
                      setEditingNodeId={setEditingNodeId}
                      totalRootNodes={nodes.length}
                    />
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function TreeNodeRow({
  editingNodeId,
  index,
  node,
  onEditStart,
  onRootNodeChange,
  onRootNodeDelete,
  onRootNodeMove,
  onSectionChildChange,
  onSectionChildDelete,
  onSectionChildInsert,
  onSectionChildMove,
  onSectionToggle,
  sectionIsExpanded,
  setEditingNodeId,
  totalRootNodes,
}: {
  editingNodeId: string | null;
  index: number;
  node: RootNode;
  onEditStart: (id: string | null) => void;
  onRootNodeChange: (id: string, title: string) => void;
  onRootNodeDelete: (id: string) => void;
  onRootNodeMove: (index: number, direction: -1 | 1) => void;
  onSectionChildChange: (sectionId: string, childId: string, title: string) => void;
  onSectionChildDelete: (sectionId: string, childId: string) => void;
  onSectionChildInsert: (
    sectionId: string,
    type: SectionChildNodeType,
    index: number,
  ) => void;
  onSectionChildMove: (sectionId: string, index: number, direction: -1 | 1) => void;
  onSectionToggle: (sectionId: string) => void;
  sectionIsExpanded: boolean;
  setEditingNodeId: (id: string | null) => void;
  totalRootNodes: number;
}) {
  const isSection = node.type === "section";

  return (
    <div>
      <ExplorerRow
        autoFocus={editingNodeId === node.id}
        canMoveDown={index < totalRootNodes - 1}
        canMoveUp={index > 0}
        icon={nodeTypeIcons[node.type]}
        isEditing={editingNodeId === node.id}
        isExpanded={isSection ? sectionIsExpanded : undefined}
        label={nodeTypeLabels[node.type]}
        onChange={(title) => onRootNodeChange(node.id, title)}
        onDelete={() => onRootNodeDelete(node.id)}
        onEditDone={() => setEditingNodeId(null)}
        onEditStart={() => onEditStart(node.id)}
        onInsertDocument={
          isSection
            ? () => onSectionChildInsert(node.id, "document", node.children.length)
            : undefined
        }
        onInsertTest={
          isSection
            ? () => onSectionChildInsert(node.id, "test", node.children.length)
            : undefined
        }
        onMoveDown={() => onRootNodeMove(index, 1)}
        onMoveUp={() => onRootNodeMove(index, -1)}
        onOpen={node.type === "section" ? undefined : () => {}}
        onToggle={isSection ? () => onSectionToggle(node.id) : undefined}
        title={node.title}
      />

      {isSection && sectionIsExpanded ? (
        <div className="ml-3 border-l border-stone-200 pl-3">
          {node.children.map((child, childIndex) => (
            <ExplorerRow
              autoFocus={editingNodeId === child.id}
              canMoveDown={childIndex < node.children.length - 1}
              canMoveUp={childIndex > 0}
              icon={nodeTypeIcons[child.type]}
              isEditing={editingNodeId === child.id}
              key={child.id}
              label={nodeTypeLabels[child.type]}
              onChange={(title) => onSectionChildChange(node.id, child.id, title)}
              onDelete={() => onSectionChildDelete(node.id, child.id)}
              onEditDone={() => setEditingNodeId(null)}
              onEditStart={() => onEditStart(child.id)}
              onMoveDown={() => onSectionChildMove(node.id, childIndex, 1)}
              onMoveUp={() => onSectionChildMove(node.id, childIndex, -1)}
              onOpen={() => {}}
              title={child.title}
            />
          ))}

        </div>
      ) : null}
    </div>
  );
}

function ExplorerRow({
  autoFocus = false,
  canMoveDown,
  canMoveUp,
  icon: Icon,
  isFixed = false,
  isEditing = false,
  isExpanded,
  isOpen = false,
  label,
  onChange,
  onDelete,
  onEditDone,
  onEditStart,
  onInsertDocument,
  onInsertSection,
  onInsertTest,
  onMoveDown,
  onMoveUp,
  onOpen,
  onToggle,
  title,
}: {
  autoFocus?: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  icon: LucideIcon;
  isFixed?: boolean;
  isEditing?: boolean;
  isExpanded?: boolean;
  isOpen?: boolean;
  label: string;
  onChange?: (title: string) => void;
  onDelete?: () => void;
  onEditDone?: () => void;
  onEditStart?: () => void;
  onInsertDocument?: () => void;
  onInsertSection?: () => void;
  onInsertTest?: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onOpen?: () => void;
  onToggle?: () => void;
  title: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  useEffect(() => {
    if (!autoFocus || !isEditing) {
      return;
    }

    inputRef.current?.select();
  }, [autoFocus, isEditing]);

  return (
    <ContextMenu onOpenChange={setIsContextMenuOpen} open={isContextMenuOpen}>
      <ContextMenuTrigger>
        <div
          className={[
            "group/row flex min-h-8 items-center gap-1 rounded-sm px-1 text-sm text-stone-700 hover:bg-stone-100",
            isOpen || isContextMenuOpen ? "bg-stone-100 text-stone-950" : "",
          ].join(" ")}
        >
          <button
            className={[
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-stone-500",
              onToggle ? "hover:bg-stone-200 hover:text-stone-800" : "invisible",
            ].join(" ")}
            onClick={onToggle}
            type="button"
          >
            {onToggle ? (
              isExpanded ? (
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
              )
            ) : null}
          </button>

          <Icon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-stone-500"
          />

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <Input
                autoFocus={autoFocus}
                className="h-7 border-0 bg-transparent px-1 text-sm text-stone-950 shadow-none placeholder:text-stone-300 focus-visible:ring-0"
                onBlur={onEditDone}
                onChange={(event) => onChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                placeholder={`Untitled ${label.toLowerCase()}`}
                ref={inputRef}
                value={title}
              />
            ) : (
              isFixed ? (
                <div className="block w-full truncate rounded-sm px-1 py-1 text-left text-sm text-stone-800">
                  {title || `Untitled ${label.toLowerCase()}`}
                </div>
              ) : (
                <div className="block w-full truncate rounded-sm px-1 py-1 text-left text-sm text-stone-800">
                  {title || `Untitled ${label.toLowerCase()}`}
                </div>
              )
            )}
          </div>

        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44">
        {onInsertDocument ? (
          <ContextMenuItem onClick={onInsertDocument}>
            <FileText aria-hidden="true" />
            <span>Add document</span>
          </ContextMenuItem>
        ) : null}
        {onInsertTest ? (
          <ContextMenuItem onClick={onInsertTest}>
            <FlaskConical aria-hidden="true" />
            <span>Add test</span>
          </ContextMenuItem>
        ) : null}
        {onInsertSection ? (
          <ContextMenuItem onClick={onInsertSection}>
            <Folder aria-hidden="true" />
            <span>Add section</span>
          </ContextMenuItem>
        ) : null}
        {onInsertDocument || onInsertTest || onInsertSection ? (
          <ContextMenuSeparator />
        ) : null}
        {onOpen ? (
          <ContextMenuItem onClick={onOpen}>
            <PanelRightOpen aria-hidden="true" />
            <span>Open</span>
          </ContextMenuItem>
        ) : null}
        {onOpen ? <ContextMenuSeparator /> : null}
        {!isFixed && onEditStart ? (
          <ContextMenuItem onClick={onEditStart}>
            <FilePenLine aria-hidden="true" />
            <span>Rename</span>
          </ContextMenuItem>
        ) : null}
        {!isFixed ? (
          <ContextMenuItem disabled={!canMoveUp} onClick={onMoveUp}>
            <ArrowUp aria-hidden="true" />
            <span>Move up</span>
          </ContextMenuItem>
        ) : null}
        {!isFixed ? (
          <ContextMenuItem disabled={!canMoveDown} onClick={onMoveDown}>
            <ArrowDown aria-hidden="true" />
            <span>Move down</span>
          </ContextMenuItem>
        ) : null}
        {!isFixed && onDelete ? <ContextMenuSeparator /> : null}
        {!isFixed && onDelete ? (
          <ContextMenuItem onClick={onDelete} variant="destructive">
            <Trash2 aria-hidden="true" />
            <span>Delete</span>
          </ContextMenuItem>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function createRootNode(
  type: RootNodeType,
  title = defaultNodeTitle(type),
  children: SectionChildNode[] = [],
): RootNode {
  const id = crypto.randomUUID();

  if (type === "section") {
    return {
      children,
      id,
      title,
      type,
    };
  }

  return {
    id,
    title,
    type,
  };
}

function createSectionChildNode(
  type: SectionChildNodeType,
  title = defaultNodeTitle(type),
): SectionChildNode {
  return {
    id: crypto.randomUUID(),
    title,
    type,
  };
}

function defaultNodeTitle(type: RootNodeType | SectionChildNodeType) {
  switch (type) {
    case "document":
      return "Untitled document";
    case "section":
      return "Untitled section";
    case "test":
      return "Untitled test";
  }
}
