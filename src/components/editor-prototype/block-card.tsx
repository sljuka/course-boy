import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Heading1,
  Image as ImageIcon,
  Pencil,
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
  const headingInputRef = useRef<HTMLInputElement | null>(null);
  const [diagramPreviewSource, setDiagramPreviewSource] = useState(
    block.type === "diagram" ? block.source : "",
  );
  const [isMarkdownEditing, setIsMarkdownEditing] = useState(autoFocusEditor);

  useEffect(() => {
    if (block.type === "markdown" && autoFocusEditor) {
      setIsMarkdownEditing(true);
    }
  }, [autoFocusEditor, block.type]);

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
  const markdownHeaderActions = (
    <div className="flex items-center gap-1">
      <Button
        aria-label="Edit markdown"
        className="h-7 w-7 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        onClick={() => setIsMarkdownEditing(true)}
        size="icon"
        variant="ghost"
      >
        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
      <Button
        aria-label="Move markdown block up"
        className="h-7 w-7 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        disabled={!canMoveUp}
        onClick={onMoveUp}
        size="icon"
        variant="ghost"
      >
        <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
      <Button
        aria-label="Move markdown block down"
        className="h-7 w-7 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        disabled={!canMoveDown}
        onClick={onMoveDown}
        size="icon"
        variant="ghost"
      >
        <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
      <Button
        aria-label="Delete markdown block"
        className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        onClick={onRemove}
        size="icon"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
  const headingHeaderActions = (
    <div className="flex items-center gap-1">
      <Button
        aria-label="Edit heading"
        className="h-7 w-7 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        onClick={() => {
          headingInputRef.current?.focus();
          headingInputRef.current?.select();
        }}
        size="icon"
        variant="ghost"
      >
        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
      <Button
        aria-label="Move heading block up"
        className="h-7 w-7 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        disabled={!canMoveUp}
        onClick={onMoveUp}
        size="icon"
        variant="ghost"
      >
        <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
      <Button
        aria-label="Move heading block down"
        className="h-7 w-7 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        disabled={!canMoveDown}
        onClick={onMoveDown}
        size="icon"
        variant="ghost"
      >
        <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
      <Button
        aria-label="Delete heading block"
        className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        onClick={onRemove}
        size="icon"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const hasPreview =
    block.type === "diagram" ||
    block.type === "image" ||
    block.type === "video";

  return (
    <section className="group relative flex flex-col gap-2 border-l-2 border-l-transparent pl-3 transition-colors hover:border-l-indigo-200">
      <div
        className={
          block.type === "heading" || block.type === "markdown"
            ? "pointer-events-none absolute top-0 right-0 left-0 z-10 flex -translate-y-full items-center justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100"
            : "pointer-events-none absolute top-0 right-0 left-0 z-10 flex -translate-y-full items-center justify-between gap-3 opacity-0 transition-opacity group-hover:opacity-100"
        }
      >
        {block.type === "heading" || block.type === "markdown" ? null : (
          <Badge className="pointer-events-auto gap-2" variant="secondary">
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="capitalize">{block.type}</span>
          </Badge>
        )}
        <div className="pointer-events-auto">
          {block.type === "heading"
            ? headingHeaderActions
            : block.type === "markdown"
              ? markdownHeaderActions
              : blockActions}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="space-y-3">
          {block.type === "heading" ? (
            <HeadingBlockFields
              autoFocus={autoFocusEditor}
              block={block}
              onChange={(nextBlock) => onChange(nextBlock)}
              ref={headingInputRef}
            />
          ) : null}
          {block.type === "markdown" ? (
            <MarkdownBlockFields
              autoFocus={autoFocusEditor}
              block={block}
              isEditing={isMarkdownEditing}
              onChange={(nextBlock) => onChange(nextBlock)}
              onEditingChange={setIsMarkdownEditing}
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

const HeadingBlockFields = forwardRef<
  HTMLInputElement,
  {
    autoFocus: boolean;
    block: HeadingBlock;
    onChange: (block: HeadingBlock) => void;
  }
>(function HeadingBlockFields({ autoFocus, block, onChange }, ref) {
  return (
    <Input
      autoFocus={autoFocus}
      className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-xl font-semibold tracking-tight text-stone-950 shadow-none placeholder:text-stone-300 focus-visible:ring-0 md:text-2xl"
      onChange={(event) =>
        onChange({
          ...block,
          text: event.target.value,
        })
      }
      placeholder="Subheading"
      ref={ref}
      value={block.text}
    />
  );
});

function MarkdownBlockFields({
  autoFocus,
  block,
  isEditing,
  onChange,
  onEditingChange,
}: {
  autoFocus: boolean;
  block: MarkdownBlock;
  isEditing: boolean;
  onChange: (block: MarkdownBlock) => void;
  onEditingChange: (isEditing: boolean) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isEditing || !autoFocus) {
      return;
    }

    textareaRef.current?.focus();
  }, [autoFocus, isEditing]);

  if (!isEditing) {
    return (
      <div className="rounded-2xl transition-colors hover:bg-stone-50">
        <MarkdownBlockPreview block={block} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        autoFocus={autoFocus}
        onBlur={() => {
          onEditingChange(false);
        }}
        className="min-h-0 resize-none overflow-hidden border-0 bg-stone-900 font-mono text-sm leading-6 text-stone-100 shadow-none placeholder:text-stone-400 focus-visible:ring-0"
        onChange={(event) =>
          onChange({
            ...block,
            source: event.target.value,
          })
        }
        placeholder="Start writing the lesson..."
        ref={textareaRef}
        rows={1}
        value={block.source}
      />
      <div className="border-t border-stone-200 pt-3">
        <MarkdownBlockPreview block={block} />
      </div>
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
        className="min-h-0 border-0 bg-stone-900 font-mono text-sm leading-6 text-stone-100 shadow-none placeholder:text-stone-400 focus-visible:ring-0"
        onChange={(event) =>
          onChange({
            ...block,
            source: event.target.value,
          })
        }
        placeholder="graph TD&#10;  A[Start] --> B[Finish]"
        rows={1}
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
          className="min-h-0"
          onChange={(event) =>
            onChange({
              ...block,
              caption: event.target.value,
            })
          }
          rows={1}
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
          className="min-h-0"
          onChange={(event) =>
            onChange({
              ...block,
              caption: event.target.value,
            })
          }
          rows={1}
          value={block.caption}
        />
      </div>
    </>
  );
}
