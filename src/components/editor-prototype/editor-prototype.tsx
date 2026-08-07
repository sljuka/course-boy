import { useState } from "react";
import { Plus } from "lucide-react";

import { EditorPrototypeBlockCard } from "@/components/editor-prototype/block-card";
import {
  createPrototypeBlock,
  initialPrototypeBlocks,
  type EditorPrototypeBlock,
  type EditorPrototypeBlockType,
} from "@/components/editor-prototype/editor-prototype-types";
import { Button } from "@/components/ui/button";
import {
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const blockTypes: EditorPrototypeBlockType[] = [
  "heading",
  "markdown",
  "diagram",
  "image",
  "video",
];

const blockTypeLabels: Record<EditorPrototypeBlockType, string> = {
  diagram: "Diagram",
  heading: "Heading",
  image: "Image",
  markdown: "Markdown",
  video: "Video",
};

export function EditorPrototype() {
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EditorPrototypeBlock[]>(initialPrototypeBlocks);
  const [autoFocusBlockId, setAutoFocusBlockId] = useState<string | null>(null);

  function insertBlock(type: EditorPrototypeBlockType, index: number) {
    const nextBlock = createPrototypeBlock(type);
    setAutoFocusBlockId(type === "heading" ? nextBlock.id : null);

    setBlocks((currentBlocks) => {
      const nextBlocks = [...currentBlocks];
      nextBlocks.splice(index, 0, nextBlock);
      return nextBlocks;
    });
  }

  function updateBlock(nextBlock: EditorPrototypeBlock) {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) => (block.id === nextBlock.id ? nextBlock : block)),
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((currentBlocks) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= currentBlocks.length) {
        return currentBlocks;
      }

      const nextBlocks = [...currentBlocks];
      const [movedBlock] = nextBlocks.splice(index, 1);
      nextBlocks.splice(nextIndex, 0, movedBlock);
      return nextBlocks;
    });
  }

  function removeBlock(id: string) {
    setBlocks((currentBlocks) => currentBlocks.filter((block) => block.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-3 border-b border-stone-200 pb-6">
        <Input
          className="h-auto border-0 bg-transparent px-0 text-5xl font-semibold tracking-tight text-stone-950 shadow-none placeholder:text-stone-400 focus-visible:ring-0"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Untitled course"
          value={title}
        />
        <CardDescription className="max-w-3xl text-base text-stone-700">
          Prototype a notebook-style course editor with document blocks,
          immediate typing, and inline previews underneath the active source.
        </CardDescription>
      </div>
      <div className="flex flex-col">
        {blocks.map((block, index) => (
          <div className="flex flex-col" key={block.id}>
            <InlineInsertMenu
              blockTypes={blockTypes}
              labels={blockTypeLabels}
              onInsert={(type) => insertBlock(type, index)}
            />
            <EditorPrototypeBlockCard
              autoFocusEditor={autoFocusBlockId === block.id}
              block={block}
              canMoveDown={index < blocks.length - 1}
              canMoveUp={index > 0}
              onChange={updateBlock}
              onMoveDown={() => moveBlock(index, 1)}
              onMoveUp={() => moveBlock(index, -1)}
              onRemove={() => removeBlock(block.id)}
            />
          </div>
        ))}
        <InlineInsertMenu
          blockTypes={blockTypes}
          labels={blockTypeLabels}
          onInsert={(type) => insertBlock(type, blocks.length)}
        />
      </div>
    </div>
  );
}

function InlineInsertMenu({
  blockTypes,
  labels,
  onInsert,
}: {
  blockTypes: EditorPrototypeBlockType[];
  labels: Record<EditorPrototypeBlockType, string>;
  onInsert: (type: EditorPrototypeBlockType) => void;
}) {
  return (
    <div className="group/insert flex justify-center">
      <div className="flex flex-wrap items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover/insert:opacity-100">
        {blockTypes.map((type) => (
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
