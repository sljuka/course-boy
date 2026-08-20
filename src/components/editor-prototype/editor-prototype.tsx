import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

import { EditorPrototypeBlockCard } from "@/components/editor-prototype/block-card";
import { LocalesTabs } from "@/components/locales-tabs";
import {
  createInitialDocumentBlocks,
  createPrototypeBlock,
  initialPrototypeBlocks,
  type EditorPrototypeBlock,
  type EditorPrototypeBlockType,
} from "@/components/editor-prototype/editor-prototype-types";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";

const blockTypes: EditorPrototypeBlockType[] = ["heading", "markdown"];

const blockTypeLabels: Record<EditorPrototypeBlockType, string> = {
  heading: "Heading",
  markdown: "Markdown",
};

export function EditorPrototype({
  activeLocale,
  blocks,
  nodeType,
  onActiveLocaleChange,
  onBlocksChange,
  onSubtitleChange,
  onTitleChange,
  supportedLocales,
  subtitle,
  title,
}: {
  activeLocale?: Locale;
  blocks?: EditorPrototypeBlock[];
  nodeType: string;
  onActiveLocaleChange?: (locale: Locale) => void;
  onBlocksChange?: (blocks: EditorPrototypeBlock[]) => void;
  onSubtitleChange?: (subtitle: string) => void;
  onTitleChange?: (title: string) => void;
  supportedLocales?: Locale[];
  subtitle?: string;
  title?: string;
}) {
  const [internalBlocks, setInternalBlocks] = useState<EditorPrototypeBlock[]>(
    nodeType === "document" ? createInitialDocumentBlocks() : initialPrototypeBlocks,
  );
  const [autoFocusBlockId, setAutoFocusBlockId] = useState<string | null>(null);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const subtitleRef = useRef<HTMLTextAreaElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isTitleEditing) {
      return;
    }

    titleRef.current?.focus();
    titleRef.current?.select();
  }, [isTitleEditing]);

  useEffect(() => {
    const textarea = subtitleRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [subtitle]);

  const resolvedBlocks = blocks ?? internalBlocks;

  function updateBlocks(
    nextBlocksOrUpdater:
      | EditorPrototypeBlock[]
      | ((currentBlocks: EditorPrototypeBlock[]) => EditorPrototypeBlock[]),
  ) {
    const nextBlocks =
      typeof nextBlocksOrUpdater === "function"
        ? nextBlocksOrUpdater(resolvedBlocks)
        : nextBlocksOrUpdater;

    if (onBlocksChange) {
      onBlocksChange(nextBlocks);
      return;
    }

    setInternalBlocks(nextBlocks);
  }

  function insertBlock(type: EditorPrototypeBlockType, index: number) {
    const nextBlock = createPrototypeBlock(type);
    setAutoFocusBlockId(
      type === "heading" || type === "markdown" ? nextBlock.id : null,
    );

    updateBlocks((currentBlocks) => {
      const nextBlocks = [...currentBlocks];
      nextBlocks.splice(index, 0, nextBlock);
      return nextBlocks;
    });
  }

  function updateBlock(nextBlock: EditorPrototypeBlock) {
    updateBlocks((currentBlocks) =>
      currentBlocks.map((block) => (block.id === nextBlock.id ? nextBlock : block)),
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    updateBlocks((currentBlocks) => {
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
    updateBlocks((currentBlocks) => currentBlocks.filter((block) => block.id !== id));
  }

  return (
    <div className="flex flex-col">
      {nodeType === "document" ? (
        <div className="flex flex-col">
          {supportedLocales &&
            activeLocale &&
            onActiveLocaleChange &&
            supportedLocales.length > 1 && (
              <LocalesTabs
                activeLocale={activeLocale}
                locales={supportedLocales}
                onActiveLocaleChange={onActiveLocaleChange}
                renderContent={() => null}
              />
            )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-b border-stone-200 pb-6">
          <Eyebrow>{nodeType}</Eyebrow>
          {isTitleEditing ? (
            <Input
              className="h-auto border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-stone-950 shadow-none placeholder:text-stone-300 focus-visible:ring-0 md:text-3xl"
              onBlur={() => setIsTitleEditing(false)}
              onChange={(event) => onTitleChange?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setIsTitleEditing(false);
                }
              }}
              placeholder="Untitled document"
              ref={titleRef}
              value={title ?? ""}
            />
          ) : (
            <button
              className="w-fit text-left"
              onClick={() => setIsTitleEditing(true)}
              type="button"
            >
              <h1 className="text-2xl font-semibold tracking-tight text-stone-950 md:text-3xl">
                {title?.trim() || "Untitled document"}
              </h1>
            </button>
          )}
          <Textarea
            className="min-h-0 resize-none overflow-hidden border-0 bg-transparent px-0 py-0 text-base font-medium text-stone-600 shadow-none placeholder:text-stone-400 focus-visible:ring-0 md:text-base"
            onChange={(event) => onSubtitleChange?.(event.target.value)}
            placeholder="Add a short description"
            ref={subtitleRef}
            rows={1}
            value={subtitle ?? ""}
          />
        </div>
      )}
      <div className="flex flex-col">
        {resolvedBlocks.map((block, index) => (
          <div className="flex flex-col" key={block.id}>
            <InlineInsertMenu
              blockTypes={blockTypes}
              labels={blockTypeLabels}
              onInsert={(type) => insertBlock(type, index)}
            />
            <EditorPrototypeBlockCard
              autoFocusEditor={autoFocusBlockId === block.id}
              block={block}
              canMoveDown={index < resolvedBlocks.length - 1}
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
          onInsert={(type) => insertBlock(type, resolvedBlocks.length)}
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
    <div className="group/insert flex min-h-8 items-center justify-center">
      <div className="flex flex-wrap items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover/insert:opacity-100">
        {blockTypes.map((type) => (
          <Button
            className="h-7 gap-1 px-2.5 text-xs"
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
