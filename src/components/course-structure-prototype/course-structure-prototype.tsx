import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Ellipsis,
  FilePenLine,
  FileText,
  FlaskConical,
  FolderTree,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
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
type EditableNode = RootNode | SectionChildNode;
type SequenceItem<TNode> =
  | {
      endIndex: number;
      items: Extract<TNode, { type: "document" | "test" }>[];
      startIndex: number;
      type: "leaf-row";
    }
  | {
      endIndex: number;
      node: Extract<TNode, { type: "section" }>;
      startIndex: number;
      type: "section";
    };

const rootInsertTypes: RootNodeType[] = ["document", "section", "test"];
const sectionInsertTypes: SectionChildNodeType[] = ["document", "test"];

const nodeTypeLabels = {
  document: "Document",
  section: "Section",
  test: "Test",
} as const;

const nodeTypeIcons = {
  document: FileText,
  section: FolderTree,
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

export function CourseStructurePrototype() {
  const [nodes, setNodes] = useState<RootNode[]>(initialNodes);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

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

  function insertRootNode(type: RootNodeType, index: number) {
    const nextNode = createRootNode(type);
    setEditingNodeId(nextNode.id);
    setNodes((currentNodes) => {
      const nextNodes = [...currentNodes];
      nextNodes.splice(index, 0, nextNode);
      return nextNodes;
    });
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
  }

  function removeRootNode(id: string) {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== id));
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

      if (currentNodes[nextIndex]?.type === "section") {
        return currentNodes;
      }

      const nextNodes = [...currentNodes];
      const [movedNode] = nextNodes.splice(index, 1);
      nextNodes.splice(nextIndex, 0, movedNode);
      return nextNodes;
    });
  }

  function moveRootSection(index: number, direction: -1 | 1) {
    setNodes((currentNodes) => {
      const sectionIndexes = currentNodes.reduce<number[]>((indexes, node, nodeIndex) => {
        if (node.type === "section") {
          indexes.push(nodeIndex);
        }

        return indexes;
      }, []);
      const currentSectionPosition = sectionIndexes.indexOf(index);

      if (currentSectionPosition === -1) {
        return currentNodes;
      }

      const nextSectionIndex = sectionIndexes[currentSectionPosition + direction];

      if (nextSectionIndex === undefined) {
        return currentNodes;
      }

      const nextNodes = [...currentNodes];
      const [movedNode] = nextNodes.splice(index, 1);
      const insertIndex =
        direction === -1 ? nextSectionIndex : nextSectionIndex + 1;
      nextNodes.splice(insertIndex, 0, movedNode);
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

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-3 border-b border-stone-200 pb-6">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-950">
          Prototype 2
        </h1>
        <CardDescription className="max-w-3xl text-base text-stone-700">
          Explore a course structure as a graph of root documents, sections, and
          tests. Sections can hold documents and tests, while root-level nodes
          work like a repository README plus top-level checks.
        </CardDescription>
      </div>
      <div>
        <NodeInsertMenu
          labels={nodeTypeLabels}
          onInsert={(type) => insertRootNode(type, 0)}
          types={rootInsertTypes}
        />
        <NodeSequence
          editingNodeId={editingNodeId}
          labels={nodeTypeLabels}
          nodes={nodes}
          onEditStart={setEditingNodeId}
          onInsertRootNode={insertRootNode}
          onRootNodeChange={updateRootNode}
          onRootNodeDelete={removeRootNode}
          onRootNodeMove={moveRootNode}
          onRootSectionMove={moveRootSection}
          onSectionChildChange={updateSectionChild}
          onSectionChildDelete={removeSectionChild}
          onSectionChildMove={moveSectionChild}
          onSectionChildInsert={insertSectionChild}
          setEditingNodeId={setEditingNodeId}
        />
      </div>
    </div>
  );
}

function NodeSequence({
  editingNodeId,
  labels,
  nodes,
  onEditStart,
  onInsertRootNode,
  onRootNodeChange,
  onRootNodeDelete,
  onRootNodeMove,
  onRootSectionMove,
  onSectionChildChange,
  onSectionChildDelete,
  onSectionChildMove,
  onSectionChildInsert,
  setEditingNodeId,
}: {
  editingNodeId: string | null;
  labels: typeof nodeTypeLabels;
  nodes: RootNode[];
  onEditStart: (id: string | null) => void;
  onInsertRootNode: (type: RootNodeType, index: number) => void;
  onRootNodeChange: (id: string, title: string) => void;
  onRootNodeDelete: (id: string) => void;
  onRootNodeMove: (index: number, direction: -1 | 1) => void;
  onRootSectionMove: (index: number, direction: -1 | 1) => void;
  onSectionChildChange: (sectionId: string, childId: string, title: string) => void;
  onSectionChildDelete: (sectionId: string, childId: string) => void;
  onSectionChildMove: (sectionId: string, index: number, direction: -1 | 1) => void;
  onSectionChildInsert: (
    sectionId: string,
    type: SectionChildNodeType,
    index: number,
  ) => void;
  setEditingNodeId: (id: string | null) => void;
}) {
  const items = groupNodesForDisplay(nodes);
  const sectionIndexes = nodes.reduce<number[]>((indexes, node, nodeIndex) => {
    if (node.type === "section") {
      indexes.push(nodeIndex);
    }

    return indexes;
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        if (item.type === "leaf-row") {
          return (
            <LeafRowGroup
              editingNodeId={editingNodeId}
              items={item.items}
              key={`leaf-row-${item.startIndex}`}
              onChange={onRootNodeChange}
              onDelete={onRootNodeDelete}
              onEditStart={onEditStart}
              onInsert={(type, index) => onInsertRootNode(type, index)}
              onMove={onRootNodeMove}
              setEditingNodeId={setEditingNodeId}
              startIndex={item.startIndex}
              types={rootInsertTypes}
            />
          );
        }

        const node = item.node;
        const sectionPosition = sectionIndexes.indexOf(item.startIndex);

        return (
          <div className="flex flex-col gap-2" key={node.id}>
            <SectionNodeCard
              autoFocus={editingNodeId === node.id}
              canMoveDown={sectionPosition < sectionIndexes.length - 1}
              canMoveUp={sectionPosition > 0}
              isEditing={editingNodeId === node.id}
              onChange={(title) => onRootNodeChange(node.id, title)}
              onDelete={() => onRootNodeDelete(node.id)}
              onEditDone={() => setEditingNodeId(null)}
              onEditStart={() => onEditStart(node.id)}
              onMoveDown={() => onRootSectionMove(item.startIndex, 1)}
              onMoveUp={() => onRootSectionMove(item.startIndex, -1)}
              title={node.title}
            />
            {node.type === "section" ? (
              <SectionChildrenGraph
                autoFocusNodeId={editingNodeId}
                onChildChange={(childId, title) =>
                  onSectionChildChange(node.id, childId, title)
                }
                onChildDelete={(childId) => onSectionChildDelete(node.id, childId)}
                onChildMove={(index, direction) =>
                  onSectionChildMove(node.id, index, direction)
                }
                onChildInsert={(type, childIndex) =>
                  onSectionChildInsert(node.id, type, childIndex)
                }
                onInsertSectionAfter={() => onInsertRootNode("section", item.endIndex + 1)}
                onEditStart={onEditStart}
                section={node}
                setEditingNodeId={setEditingNodeId}
              />
            ) : null}
            {node.type === "section" ? null : (
              <NodeInsertMenu
                labels={labels}
                onInsert={(type) => onInsertRootNode(type, item.endIndex + 1)}
                types={rootInsertTypes}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionChildrenGraph({
  autoFocusNodeId,
  onChildChange,
  onChildDelete,
  onChildMove,
  onChildInsert,
  onInsertSectionAfter,
  onEditStart,
  section,
  setEditingNodeId,
}: {
  autoFocusNodeId: string | null;
  onChildChange: (childId: string, title: string) => void;
  onChildDelete: (childId: string) => void;
  onChildMove: (index: number, direction: -1 | 1) => void;
  onChildInsert: (type: SectionChildNodeType, index: number) => void;
  onInsertSectionAfter: () => void;
  onEditStart: (id: string | null) => void;
  section: SectionNode;
  setEditingNodeId: (id: string | null) => void;
}) {
  const items = groupNodesForDisplay(section.children);

  return (
    <div className="ml-4 border-l border-dashed border-stone-300 pl-3">
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="relative min-h-16">
            <div className="absolute left-0 top-8">
              <InlineInsertMenu
                labels={nodeTypeLabels}
                onInsert={(type) => onChildInsert(type as SectionChildNodeType, 0)}
                types={sectionInsertTypes}
              />
            </div>
          </div>
        ) : null}
        {items.map((item) => {
          if (item.type === "leaf-row") {
            return (
              <LeafRowGroup
                editingNodeId={autoFocusNodeId}
                items={item.items}
                key={`section-leaf-row-${section.id}-${item.startIndex}`}
                onChange={onChildChange}
                onDelete={onChildDelete}
                onEditStart={onEditStart}
                onInsert={(type, index) => onChildInsert(type, index)}
                onMove={onChildMove}
                onTrailingInsert={(type, index) => {
                  if (type === "section") {
                    onInsertSectionAfter();
                    return;
                  }

                  onChildInsert(type as SectionChildNodeType, index);
                }}
                trailingTypes={rootInsertTypes}
                setEditingNodeId={setEditingNodeId}
                startIndex={item.startIndex}
                types={sectionInsertTypes}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

function LeafRowGroup<TNode extends EditableNode>({
  editingNodeId,
  items,
  onChange,
  onDelete,
  onEditStart,
  onInsert,
  onMove,
  onTrailingInsert,
  setEditingNodeId,
  startIndex,
  trailingTypes,
  types,
}: {
  editingNodeId: string | null;
  items: Extract<TNode, { type: "document" | "test" }>[];
  onChange: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onEditStart: (id: string | null) => void;
  onInsert: (type: TNode["type"], index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onTrailingInsert?: (type: RootNodeType | TNode["type"], index: number) => void;
  setEditingNodeId: (id: string | null) => void;
  startIndex: number;
  trailingTypes?: (RootNodeType | TNode["type"])[];
  types: TNode["type"][];
}) {
  return (
    <div className="relative flex flex-wrap items-start gap-x-0 gap-y-6 pt-4">
      <div className="absolute left-0 top-8">
        <InlineInsertMenu
          labels={nodeTypeLabels}
          onInsert={(type) => onInsert(type as TNode["type"], startIndex)}
          types={types}
        />
      </div>
      {items.map((node, offset) => (
        <div className="relative flex w-32 items-start justify-center" key={node.id}>
          {offset > 0 ? (
            <div
              className="pointer-events-none absolute left-0 top-5 h-px w-10"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, rgb(168 162 158) 0 4px, transparent 4px 8px)",
              }}
            />
          ) : null}
          {offset < items.length - 1 ? (
            <div
              className="pointer-events-none absolute right-0 top-5 h-px w-10"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, rgb(168 162 158) 0 4px, transparent 4px 8px)",
              }}
            />
          ) : null}
          <LeafNodeItem
            autoFocus={editingNodeId === node.id}
            icon={nodeTypeIcons[node.type]}
            isEditing={editingNodeId === node.id}
            label={nodeTypeLabels[node.type]}
            onChange={(title) => onChange(node.id, title)}
            onDelete={() => onDelete(node.id)}
            onEditDone={() => setEditingNodeId(null)}
            onEditStart={() => onEditStart(node.id)}
            onMoveLeft={
              offset > 0 ? () => onMove(startIndex + offset, -1) : undefined
            }
            onMoveRight={
              offset < items.length - 1
                ? () => onMove(startIndex + offset, 1)
                : undefined
            }
            title={node.title}
          />
          <div className="absolute right-0 top-0">
            <InlineInsertMenu
              labels={nodeTypeLabels}
              onInsert={(type) => {
                const insertIndex = startIndex + offset + 1;

                if (offset === items.length - 1 && onTrailingInsert) {
                  onTrailingInsert(type as RootNodeType | TNode["type"], insertIndex);
                  return;
                }

                onInsert(type as TNode["type"], insertIndex);
              }}
              types={
                offset === items.length - 1 && trailingTypes
                  ? trailingTypes
                  : types
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionNodeCard({
  autoFocus,
  canMoveDown,
  canMoveUp,
  isEditing,
  onChange,
  onDelete,
  onEditDone,
  onEditStart,
  onMoveDown,
  onMoveUp,
  title,
}: {
  autoFocus: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  isEditing: boolean;
  onChange: (title: string) => void;
  onDelete: () => void;
  onEditDone: () => void;
  onEditStart: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  title: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!autoFocus || !isEditing) {
      return;
    }

    inputRef.current?.select();
  }, [autoFocus, isEditing]);

  return (
    <div className="group/node relative flex w-full items-center gap-3 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-sm border border-stone-200 bg-white px-4 py-3 shadow-[0_12px_30px_-24px_rgba(28,25,23,0.35)] transition-colors group-hover/node:border-stone-300">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-stone-100 text-stone-600">
          <FolderTree aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <Input
              autoFocus={autoFocus}
              className="h-auto border-0 bg-transparent px-0 pt-0.5 text-lg font-medium text-stone-950 shadow-none placeholder:text-stone-300 focus-visible:ring-0"
              onBlur={onEditDone}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              placeholder="Untitled section"
              ref={inputRef}
              value={title}
            />
          ) : (
            <button
              className="block w-full truncate text-left text-lg font-medium text-stone-950 outline-none"
              onClick={onEditStart}
              type="button"
            >
              {title || "Untitled section"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover/node:opacity-100 group-focus-within/node:opacity-100">
          <Button
            disabled={!canMoveUp}
            onClick={onMoveUp}
            size="icon"
            variant="secondary"
          >
            <ArrowUp aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            disabled={!canMoveDown}
            onClick={onMoveDown}
            size="icon"
            variant="secondary"
          >
            <ArrowDown aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button onClick={onDelete} size="icon" variant="secondary">
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function LeafNodeItem({
  autoFocus,
  icon: Icon,
  isEditing,
  label,
  onChange,
  onDelete,
  onEditDone,
  onEditStart,
  onMoveLeft,
  onMoveRight,
  title,
}: {
  autoFocus: boolean;
  icon: typeof FileText;
  isEditing: boolean;
  label: string;
  onChange: (title: string) => void;
  onDelete: () => void;
  onEditDone: () => void;
  onEditStart: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  title: string;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (menuContainerRef.current?.contains(target)) {
        return;
      }

      setIsMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!autoFocus || !isEditing) {
      return;
    }

    inputRef.current?.select();
  }, [autoFocus, isEditing]);

  return (
    <div className="group/node flex w-32 flex-col items-center gap-1.5">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-sm border border-stone-200 bg-white text-stone-700 shadow-[0_12px_30px_-24px_rgba(28,25,23,0.35)] transition-colors group-hover/node:border-stone-300">
        <Icon aria-hidden="true" className="h-6 w-6" />
        <div
          className="absolute right-0 top-0 z-30 translate-x-1/4 -translate-y-1/4"
          ref={menuContainerRef}
        >
          <button
            className="flex h-4 w-4 items-center justify-center rounded-sm border border-stone-200 bg-white text-stone-500 opacity-0 shadow-sm transition-opacity hover:text-stone-950 group-hover/node:opacity-100"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <Ellipsis aria-hidden="true" className="h-3 w-3" />
          </button>
          {isMenuOpen ? (
            <div className="absolute left-full top-0 z-40 ml-2 flex min-w-28 flex-col gap-1 rounded-sm border border-stone-200 bg-white p-1 shadow-[0_16px_40px_-28px_rgba(28,25,23,0.45)]">
              <LeafNodeMenuItem
                icon={FilePenLine}
                label="Open"
                onClick={() => {
                  setIsMenuOpen(false);
                }}
              />
              {onMoveLeft ? (
                <LeafNodeMenuItem
                  icon={ArrowLeft}
                  label="Left"
                  onClick={() => {
                    onMoveLeft();
                    setIsMenuOpen(false);
                  }}
                />
              ) : null}
              {onMoveRight ? (
                <LeafNodeMenuItem
                  icon={ArrowRight}
                  label="Right"
                  onClick={() => {
                    onMoveRight();
                    setIsMenuOpen(false);
                  }}
                />
              ) : null}
              <LeafNodeMenuItem
                icon={Trash2}
                label="Delete"
                onClick={() => {
                  onDelete();
                  setIsMenuOpen(false);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
      {isEditing ? (
        <Input
          autoFocus={autoFocus}
          className="h-auto w-full border-0 bg-transparent px-0 text-center text-xs font-medium text-stone-950 shadow-none placeholder:text-stone-300 focus-visible:ring-0"
          onBlur={onEditDone}
          onChange={(event) => onChange(event.target.value)}
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
        <button
          className="line-clamp-2 w-full px-1 text-center text-xs font-medium text-stone-950 outline-none"
          onClick={onEditStart}
          type="button"
        >
          {title || `Untitled ${label.toLowerCase()}`}
        </button>
      )}
    </div>
  );
}

function LeafNodeMenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon?: typeof FileText;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[11px] text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
      onClick={onClick}
      type="button"
    >
      {Icon ? <Icon aria-hidden="true" className="h-3.5 w-3.5" /> : null}
      <span>{label}</span>
    </button>
  );
}

function NodeInsertMenu<TType extends string>({
  className,
  compact = false,
  labels,
  onInsert,
  types,
}: {
  className?: string;
  compact?: boolean;
  labels: Record<TType, string>;
  onInsert: (type: TType) => void;
  types: TType[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (compact) {
    return (
      <div className={className ? `relative z-20 ${className}` : "relative z-20"}>
        <Button
          className="h-7 w-7 rounded-none p-0"
          onClick={() => setIsOpen((current) => !current)}
          variant="secondary"
        >
          <Plus aria-hidden="true" className="h-3 w-3" />
        </Button>
        {isOpen ? (
          <div className="absolute left-0 top-full z-50 mt-1 flex min-w-28 flex-col gap-1 rounded-sm border border-stone-200 bg-white p-1 opacity-100 shadow-[0_16px_40px_-28px_rgba(28,25,23,0.45)]">
            {types.map((type) => (
              <button
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[11px] text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
                key={type}
                onClick={() => {
                  onInsert(type);
                  setIsOpen(false);
                }}
                type="button"
              >
                {type === "document" ? (
                  <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                ) : null}
                {type === "test" ? (
                  <FlaskConical aria-hidden="true" className="h-3.5 w-3.5" />
                ) : null}
                {type === "section" ? (
                  <FolderTree aria-hidden="true" className="h-3.5 w-3.5" />
                ) : null}
                <span>{labels[type]}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="group/insert relative z-0 flex justify-center py-1">
      <div className="flex flex-wrap items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover/insert:opacity-100">
        {types.map((type) => (
          <Button
            className="h-7 gap-1 px-2.5 text-[11px]"
            key={type}
            onClick={() => onInsert(type)}
            variant="secondary"
          >
            <Plus aria-hidden="true" className="h-3 w-3" />
            <span>{labels[type]}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function InlineInsertMenu<TType extends string>({
  labels,
  onInsert,
  types,
}: {
  labels: Record<TType, string>;
  onInsert: (type: TType) => void;
  types: TType[];
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="group/insert-inline relative z-20 flex h-10 w-10 items-start justify-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div
        className={[
          "absolute left-1/2 top-5 -translate-x-1/2 -translate-y-[115%] transition-opacity",
          isVisible
            ? "pointer-events-auto visible opacity-100"
            : "pointer-events-none invisible opacity-0",
        ].join(" ")}
      >
        <NodeInsertMenu
          compact
          className="opacity-100"
          labels={labels}
          onInsert={onInsert}
          types={types}
        />
      </div>
    </div>
  );
}

function groupNodesForDisplay<TNode extends EditableNode>(
  nodes: TNode[],
): SequenceItem<TNode>[] {
  const items: SequenceItem<TNode>[] = [];
  let index = 0;

  while (index < nodes.length) {
    const node = nodes[index];

    if (node.type !== "section") {
      const leafNodes: Extract<TNode, { type: "document" | "test" }>[] = [];
      const startIndex = index;

      while (index < nodes.length && nodes[index]?.type !== "section") {
        leafNodes.push(
          nodes[index] as Extract<TNode, { type: "document" | "test" }>,
        );
        index += 1;
      }

      items.push({
        endIndex: index - 1,
        items: leafNodes,
        startIndex,
        type: "leaf-row",
      });
      continue;
    }

    items.push({
      endIndex: index,
      node: node as Extract<TNode, { type: "section" }>,
      startIndex: index,
      type: "section",
    });
    index += 1;
  }

  return items;
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
