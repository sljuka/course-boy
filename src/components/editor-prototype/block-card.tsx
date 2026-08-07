import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Heading1,
  Image as ImageIcon,
  PlaySquare,
  Trash2,
  Waypoints,
  WholeWord,
} from "lucide-react";

import {
  DiagramBlockPreview,
  ImageBlockPreview,
  MarkdownBlockPreview,
  VideoBlockPreview,
} from "@/components/editor-prototype/block-preview";
import type {
  DiagramBlock,
  EditorPrototypeBlock,
  HeadingBlock,
  ImageBlock,
  MarkdownBlock,
  VideoBlock,
} from "@/components/editor-prototype/editor-prototype-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const blockTypeIcons = {
  diagram: Waypoints,
  heading: Heading1,
  image: ImageIcon,
  markdown: WholeWord,
  video: PlaySquare,
} as const;

export function EditorPrototypeBlockCard({
  autoFocusEditor,
  block,
  canMoveDown,
  canMoveUp,
  onChange,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  autoFocusEditor: boolean;
  block: EditorPrototypeBlock;
  canMoveDown: boolean;
  canMoveUp: boolean;
  onChange: (block: EditorPrototypeBlock) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
}) {
  const Icon = blockTypeIcons[block.type];
  const [diagramPreviewSource, setDiagramPreviewSource] = useState(
    block.type === "diagram" ? block.source : "",
  );

  useEffect(() => {
    if (block.type !== "diagram") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDiagramPreviewSource(block.source);
    }, 280);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [block]);

  const blockActions = (
    <div className="flex items-center gap-2">
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
      <Button onClick={onRemove} size="icon" variant="secondary">
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );

  const hasPreview =
    block.type === "markdown" ||
    block.type === "diagram" ||
    block.type === "image" ||
    block.type === "video";

  return (
    <section className="group flex flex-col gap-3 border-l-2 border-l-transparent pl-3 transition-colors hover:border-l-indigo-200">
      {block.type === "heading" ? null : (
        <div className="flex items-center justify-between gap-3 opacity-0 transition-opacity group-hover:opacity-100">
          <Badge className="gap-2" variant="secondary">
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="capitalize">{block.type}</span>
          </Badge>
          {blockActions}
        </div>
      )}
      <div className="flex flex-col gap-4">
        <div className="space-y-3">
          {block.type === "heading" ? (
            <HeadingBlockFields
              actions={blockActions}
              autoFocus={autoFocusEditor}
              block={block}
              onChange={(nextBlock) => onChange(nextBlock)}
            />
          ) : null}
          {block.type === "markdown" ? (
            <MarkdownBlockFields
              autoFocus={autoFocusEditor}
              block={block}
              onChange={(nextBlock) => onChange(nextBlock)}
            />
          ) : null}
          {block.type === "diagram" ? (
            <DiagramBlockFields
              autoFocus={autoFocusEditor}
              block={block}
              onChange={(nextBlock) => onChange(nextBlock)}
            />
          ) : null}
          {block.type === "image" ? (
            <ImageBlockFields
              block={block}
              onChange={(nextBlock) => onChange(nextBlock)}
            />
          ) : null}
          {block.type === "video" ? (
            <VideoBlockFields
              block={block}
              onChange={(nextBlock) => onChange(nextBlock)}
            />
          ) : null}
        </div>
        {hasPreview ? (
          <div className="space-y-2 border-t border-stone-200 pt-3">
            {block.type === "markdown" ? <MarkdownBlockPreview block={block} /> : null}
            {block.type === "diagram" ? (
              <DiagramBlockPreview
                block={block}
                previewSource={diagramPreviewSource}
              />
            ) : null}
            {block.type === "image" ? <ImageBlockPreview block={block} /> : null}
            {block.type === "video" ? <VideoBlockPreview block={block} /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HeadingBlockFields({
  actions,
  autoFocus,
  block,
  onChange,
}: {
  actions: ReactNode;
  autoFocus: boolean;
  block: HeadingBlock;
  onChange: (block: HeadingBlock) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Input
        autoFocus={autoFocus}
        className="h-auto flex-1 border-0 bg-transparent px-0 text-2xl font-semibold tracking-tight text-stone-950 shadow-none placeholder:text-stone-300 focus-visible:ring-0 md:text-3xl"
        onChange={(event) =>
          onChange({
            ...block,
            text: event.target.value,
          })
        }
        placeholder="Subheading"
        value={block.text}
      />
      <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {actions}
      </div>
    </div>
  );
}

function MarkdownBlockFields({
  autoFocus,
  block,
  onChange,
}: {
  autoFocus: boolean;
  block: MarkdownBlock;
  onChange: (block: MarkdownBlock) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [block.source]);

  return (
    <div className="space-y-2">
      <Textarea
        autoFocus={autoFocus}
        className="min-h-[calc(theme(spacing.6)*2+theme(spacing.4))] resize-none overflow-hidden border-0 bg-stone-900 font-mono text-sm leading-6 text-stone-100 shadow-none placeholder:text-stone-400 focus-visible:ring-0"
        onChange={(event) =>
          onChange({
            ...block,
            source: event.target.value,
          })
        }
        placeholder="Start writing the lesson..."
        ref={textareaRef}
        rows={2}
        value={block.source}
      />
    </div>
  );
}

function DiagramBlockFields({
  autoFocus,
  block,
  onChange,
}: {
  autoFocus: boolean;
  block: DiagramBlock;
  onChange: (block: DiagramBlock) => void;
}) {
  return (
    <div className="space-y-2">
      <Textarea
        autoFocus={autoFocus}
        className="min-h-40 border-0 bg-stone-900 font-mono text-sm leading-6 text-stone-100 shadow-none placeholder:text-stone-400 focus-visible:ring-0"
        onChange={(event) =>
          onChange({
            ...block,
            source: event.target.value,
          })
        }
        placeholder="graph TD&#10;  A[Start] --> B[Finish]"
        value={block.source}
      />
    </div>
  );
}

function ImageBlockFields({
  block,
  onChange,
}: {
  block: ImageBlock;
  onChange: (block: ImageBlock) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <div className="text-sm font-medium text-stone-700">Image source</div>
        <Input
          onChange={(event) =>
            onChange({
              ...block,
              src: event.target.value,
            })
          }
          placeholder="https://example.com/fractions.png"
          value={block.src}
        />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium text-stone-700">Alt text</div>
        <Input
          onChange={(event) =>
            onChange({
              ...block,
              alt: event.target.value,
            })
          }
          placeholder="Fraction circles illustration"
          value={block.alt}
        />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium text-stone-700">Caption</div>
        <Textarea
          className="min-h-28"
          onChange={(event) =>
            onChange({
              ...block,
              caption: event.target.value,
            })
          }
          value={block.caption}
        />
      </div>
    </>
  );
}

function VideoBlockFields({
  block,
  onChange,
}: {
  block: VideoBlock;
  onChange: (block: VideoBlock) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <div className="text-sm font-medium text-stone-700">Video URL</div>
        <Input
          onChange={(event) =>
            onChange({
              ...block,
              src: event.target.value,
            })
          }
          placeholder="https://www.youtube.com/watch?v=..."
          value={block.src}
        />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium text-stone-700">Caption</div>
        <Textarea
          className="min-h-28"
          onChange={(event) =>
            onChange({
              ...block,
              caption: event.target.value,
            })
          }
          value={block.caption}
        />
      </div>
    </>
  );
}
