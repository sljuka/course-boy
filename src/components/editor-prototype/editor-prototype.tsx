import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

import { EditorPrototypeBlockCard } from "@/components/editor-prototype/block-card";
import { LocalesTabs } from "@/components/locales-tabs";
import {
  createInitialDocumentBlocks,
  createPrototypeBlock,
  createUploadedPrototypeBlock,
  initialPrototypeBlocks,
  type DocumentAssetKind,
  type EditorPrototypeBlock,
  type EditorPrototypeBlockType,
} from "@/components/editor-prototype/editor-prototype-types";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUploadCourseAssetMutation } from "@/lib/course-queries";
import type { Locale } from "@/lib/i18n";

const blockTypes: EditorPrototypeBlockType[] = [
  "heading",
  "markdown",
  "image",
  "video",
  "audio",
];

const blockTypeLabels: Record<EditorPrototypeBlockType, string> = {
  audio: "Audio",
  heading: "Heading",
  image: "Image",
  markdown: "Markdown",
  video: "Video",
};

function isUploadedBlockType(type: EditorPrototypeBlockType): type is DocumentAssetKind {
  return type === "image" || type === "video" || type === "audio";
}

export function EditorPrototype({
  activeLocale,
  blocks,
  courseId,
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
  courseId?: string;
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
  const titleRef = useRef<HTMLInputElement | null>(null);
  const uploadAssetMutation = useUploadCourseAssetMutation();

  useEffect(() => {
    if (!isTitleEditing) {
      return;
    }

    titleRef.current?.focus();
    titleRef.current?.select();
  }, [isTitleEditing]);

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

  async function insertUploadedBlock(kind: DocumentAssetKind, index: number) {
    if (!courseId) {
      return;
    }

    const result = await uploadAssetMutation.mutateAsync({ courseId, kind });

    if (!result) {
      return;
    }

    const nextBlock = createUploadedPrototypeBlock(kind, result.path);

    updateBlocks((currentBlocks) => {
      const nextBlocks = [...currentBlocks];
      nextBlocks.splice(index, 0, nextBlock);
      return nextBlocks;
    });
  }

  function handleInsert(type: EditorPrototypeBlockType, index: number) {
    if (isUploadedBlockType(type)) {
      void insertUploadedBlock(type, index);
      return;
    }

    insertBlock(type, index);
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
        <div className="flex flex-col gap-3 border-b border-border pb-6">
          <Eyebrow>{nodeType}</Eyebrow>
          {isTitleEditing ? (
            <Input
              className="text-2xl font-semibold tracking-tight md:text-3xl"
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
              variant="ghost"
            />
          ) : (
            <button
              className="w-fit text-left"
              onClick={() => setIsTitleEditing(true)}
              type="button"
            >
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {title?.trim() || "Untitled document"}
              </h1>
            </button>
          )}
          <Textarea
            className="min-h-0 resize-none overflow-hidden text-base font-medium text-muted-foreground md:text-base"
            onChange={(event) => onSubtitleChange?.(event.target.value)}
            placeholder="Add a short description"
            rows={1}
            variant="ghost"
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
              onInsert={(type) => handleInsert(type, index)}
            />
            <EditorPrototypeBlockCard
              autoFocusEditor={autoFocusBlockId === block.id}
              block={block}
              canMoveDown={index < resolvedBlocks.length - 1}
              canMoveUp={index > 0}
              courseId={courseId}
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
          onInsert={(type) => handleInsert(type, resolvedBlocks.length)}
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
