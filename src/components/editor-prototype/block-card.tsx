import { forwardRef, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2, type LucideIcon } from "lucide-react";

import { MarkdownBlockPreview } from "@/components/editor-prototype/block-preview";
import type {
  AudioBlock,
  EditorPrototypeBlock,
  HeadingBlock,
  ImageBlock,
  MarkdownBlock,
  VideoBlock,
} from "@/components/editor-prototype/editor-prototype-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { matkoAssetUrl } from "@/lib/course-assets";

function HeaderIconButton({
  disabled,
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "danger" | "default";
}) {
  return (
    <Button
      aria-label={label}
      className={tone === "danger" ? "h-7 w-7" : "h-7 w-7 text-muted-foreground"}
      disabled={disabled}
      onClick={onClick}
      size="icon"
      variant={tone === "danger" ? "destructive" : "ghost"}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
    </Button>
  );
}

function HeaderMoveAndDeleteButtons({
  blockLabel,
  canMoveDown,
  canMoveUp,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  blockLabel: string;
  canMoveDown: boolean;
  canMoveUp: boolean;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <HeaderIconButton
        disabled={!canMoveUp}
        icon={ArrowUp}
        label={`Move ${blockLabel} block up`}
        onClick={onMoveUp}
      />
      <HeaderIconButton
        disabled={!canMoveDown}
        icon={ArrowDown}
        label={`Move ${blockLabel} block down`}
        onClick={onMoveDown}
      />
      <HeaderIconButton
        icon={Trash2}
        label={`Delete ${blockLabel} block`}
        onClick={onRemove}
        tone="danger"
      />
    </>
  );
}

export function EditorPrototypeBlockCard({
  autoFocusEditor,
  block,
  canMoveDown,
  canMoveUp,
  courseId,
  onChange,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  autoFocusEditor: boolean;
  block: EditorPrototypeBlock;
  canMoveDown: boolean;
  canMoveUp: boolean;
  courseId: string | undefined;
  onChange: (block: EditorPrototypeBlock) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
}) {
  const headingInputRef = useRef<HTMLInputElement | null>(null);
  const [isMarkdownEditing, setIsMarkdownEditing] = useState(autoFocusEditor);

  useEffect(() => {
    if (block.type === "markdown" && autoFocusEditor) {
      setIsMarkdownEditing(true);
    }
  }, [autoFocusEditor, block.type]);

  const markdownHeaderActions = (
    <div className="flex items-center gap-1">
      <HeaderIconButton
        icon={Pencil}
        label="Edit markdown"
        onClick={() => setIsMarkdownEditing(true)}
      />
      <HeaderMoveAndDeleteButtons
        blockLabel="markdown"
        canMoveDown={canMoveDown}
        canMoveUp={canMoveUp}
        onMoveDown={onMoveDown}
        onMoveUp={onMoveUp}
        onRemove={onRemove}
      />
    </div>
  );
  const headingHeaderActions = (
    <div className="flex items-center gap-1">
      <HeaderIconButton
        icon={Pencil}
        label="Edit heading"
        onClick={() => {
          headingInputRef.current?.focus();
          headingInputRef.current?.select();
        }}
      />
      <HeaderMoveAndDeleteButtons
        blockLabel="heading"
        canMoveDown={canMoveDown}
        canMoveUp={canMoveUp}
        onMoveDown={onMoveDown}
        onMoveUp={onMoveUp}
        onRemove={onRemove}
      />
    </div>
  );
  const mediaHeaderActions = (
    <div className="flex items-center gap-1">
      <HeaderMoveAndDeleteButtons
        blockLabel="media"
        canMoveDown={canMoveDown}
        canMoveUp={canMoveUp}
        onMoveDown={onMoveDown}
        onMoveUp={onMoveUp}
        onRemove={onRemove}
      />
    </div>
  );

  return (
    <section className="group relative flex flex-col gap-2 border-l-2 border-l-transparent pl-3 transition-colors hover:border-l-primary/40">
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 flex -translate-y-full items-center justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="pointer-events-auto">
          {block.type === "heading"
            ? headingHeaderActions
            : block.type === "markdown"
              ? markdownHeaderActions
              : mediaHeaderActions}
        </div>
      </div>
      <div className="space-y-3">
        {block.type === "heading" ? (
          <HeadingBlockFields
            autoFocus={autoFocusEditor}
            block={block}
            onChange={(nextBlock) => onChange(nextBlock)}
            ref={headingInputRef}
          />
        ) : block.type === "markdown" ? (
          <MarkdownBlockFields
            autoFocus={autoFocusEditor}
            block={block}
            isEditing={isMarkdownEditing}
            onChange={(nextBlock) => onChange(nextBlock)}
            onEditingChange={setIsMarkdownEditing}
          />
        ) : block.type === "image" ? (
          <ImageBlockFields block={block} courseId={courseId} onChange={onChange} />
        ) : block.type === "video" ? (
          <VideoBlockFields block={block} courseId={courseId} onChange={onChange} />
        ) : (
          <AudioBlockFields block={block} courseId={courseId} onChange={onChange} />
        )}
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
      className="flex-1 text-xl font-semibold tracking-tight md:text-2xl"
      onChange={(event) =>
        onChange({
          ...block,
          text: event.target.value,
        })
      }
      placeholder="Subheading"
      ref={ref}
      value={block.text}
      variant="ghost"
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
      <div className="rounded-2xl transition-colors hover:bg-muted">
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
        // eslint-disable-next-line shadcn/no-raw-colors -- the one deliberate dark code-editor surface (see the Textarea contract note in eslint.config.mjs), not themed
        className="min-h-0 resize-none overflow-hidden border-0 bg-stone-900 font-mono text-sm leading-6 text-stone-100 shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
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
      <div className="border-t border-border pt-3">
        <MarkdownBlockPreview block={block} />
      </div>
    </div>
  );
}

function ImageBlockFields({
  block,
  courseId,
  onChange,
}: {
  block: ImageBlock;
  courseId: string | undefined;
  onChange: (block: ImageBlock) => void;
}) {
  return (
    <div className="space-y-2">
      {courseId && (
        <img
          alt={block.alt}
          className="max-h-96 w-full object-contain"
          src={matkoAssetUrl(courseId, block.path)}
        />
      )}
      <Input
        onChange={(event) => onChange({ ...block, alt: event.target.value })}
        placeholder="Alt text"
        value={block.alt}
      />
      <Input
        onChange={(event) => onChange({ ...block, caption: event.target.value })}
        placeholder="Caption (optional)"
        value={block.caption}
      />
    </div>
  );
}

function VideoBlockFields({
  block,
  courseId,
  onChange,
}: {
  block: VideoBlock;
  courseId: string | undefined;
  onChange: (block: VideoBlock) => void;
}) {
  return (
    <div className="space-y-2">
      {courseId && (
        <video className="w-full" controls src={matkoAssetUrl(courseId, block.path)} />
      )}
      <Input
        onChange={(event) => onChange({ ...block, caption: event.target.value })}
        placeholder="Caption (optional)"
        value={block.caption}
      />
    </div>
  );
}

function AudioBlockFields({
  block,
  courseId,
  onChange,
}: {
  block: AudioBlock;
  courseId: string | undefined;
  onChange: (block: AudioBlock) => void;
}) {
  return (
    <div className="space-y-2">
      {courseId && (
        <audio className="w-full" controls src={matkoAssetUrl(courseId, block.path)} />
      )}
      <Input
        onChange={(event) => onChange({ ...block, caption: event.target.value })}
        placeholder="Caption (optional)"
        value={block.caption}
      />
    </div>
  );
}
