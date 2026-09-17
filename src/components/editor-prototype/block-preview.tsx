import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { MarkdownBlock } from "@/components/editor-prototype/editor-prototype-types";

export function MarkdownBlockPreview({ block }: { block: MarkdownBlock }) {
  if (!block.source.trim()) {
    return (
      <div className="text-base leading-7 text-muted-foreground">
        Preview appears here while the learner-facing output takes shape.
      </div>
    );
  }

  return (
    <MarkdownRenderer source={block.source} />
  );
}
