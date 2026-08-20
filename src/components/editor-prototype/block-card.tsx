import { forwardRef, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";

import { MarkdownBlockPreview } from "@/components/editor-prototype/block-preview";
import type {
  EditorPrototypeBlock,
  HeadingBlock,
  MarkdownBlock,
} from "@/components/editor-prototype/editor-prototype-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  const headingInputRef = useRef<HTMLInputElement | null>(null);
  const [isMarkdownEditing, setIsMarkdownEditing] = useState(autoFocusEditor);

  useEffect(() => {
    if (block.type === "markdown" && autoFocusEditor) {
      setIsMarkdownEditing(true);
    }
  }, [autoFocusEditor, block.type]);

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

  return (
    <section className="group relative flex flex-col gap-2 border-l-2 border-l-transparent pl-3 transition-colors hover:border-l-indigo-200">
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 flex -translate-y-full items-center justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="pointer-events-auto">
          {block.type === "heading" ? headingHeaderActions : markdownHeaderActions}
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
        ) : (
          <MarkdownBlockFields
            autoFocus={autoFocusEditor}
            block={block}
            isEditing={isMarkdownEditing}
            onChange={(nextBlock) => onChange(nextBlock)}
            onEditingChange={setIsMarkdownEditing}
          />
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
