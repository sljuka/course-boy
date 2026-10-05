import type { CourseMnemonic, MnemonicSegment } from "@/lib/mnemonics";
import { createMnemonicMatcher } from "@/lib/mnemonics";

// Adds course mnemonics (SLJ-37) to a lesson's BlockNote blocks just before
// they're shown: every matching term in the text becomes a `mnemonic` inline
// node holding that text (see `mnemonic-inline-content.tsx`), so it's marked
// and shows its mnemonic on hover. Only the copy that's
// rendered changes; the lesson is never saved from here.
//
// Walks blocks in reading order with one matcher, so "first N places" counts
// across the whole lesson. Code (code blocks and `code`-styled text) and
// links are left alone; so are exercises, whose prompts aren't plain blocks.

type InlineNode = Record<string, unknown> & { type?: string };
type Block = Record<string, unknown> & { children?: Block[]; content?: unknown; type?: string };

export function decorateBlocksWithMnemonics<T>(blocks: T[], mnemonics: CourseMnemonic[]): T[] {
  if (mnemonics.length === 0) {
    return blocks;
  }

  const matcher = createMnemonicMatcher(mnemonics);

  const decorateInline = (content: unknown): unknown => {
    if (typeof content === "string") {
      return decorateInline([{ styles: {}, text: content, type: "text" }]);
    }

    if (!Array.isArray(content)) {
      return content;
    }

    return content.flatMap((node: InlineNode | string) => {
      const item: InlineNode = typeof node === "string" ? { styles: {}, text: node, type: "text" } : node;
      const styles = (item.styles ?? {}) as Record<string, unknown>;

      if (item.type !== "text" || typeof item.text !== "string" || styles.code) {
        return [item];
      }

      return matcher.split(item.text).map((segment: MnemonicSegment): InlineNode =>
        "mnemonic" in segment
          ? { content: [{ ...item, text: segment.text }], props: { mnemonic: segment.mnemonic }, type: "mnemonic" }
          : { ...item, text: segment.text },
      );
    });
  };

  const decorateTable = (content: Record<string, unknown>) => ({
    ...content,
    rows: ((content.rows ?? []) as { cells: unknown[] }[]).map((row) => ({
      ...row,
      cells: row.cells.map((cell) =>
        cell && typeof cell === "object" && !Array.isArray(cell) && "content" in cell
          ? { ...cell, content: decorateInline((cell as { content: unknown }).content) }
          : decorateInline(cell),
      ),
    })),
  });

  const decorateBlock = (block: Block): Block => {
    if (block.type === "codeBlock" || block.type === "exercise" || block.type === "unsupported") {
      return block;
    }

    const content = block.content;
    const decorated: Block = { ...block };

    if (content && typeof content === "object" && !Array.isArray(content) && (content as InlineNode).type === "tableContent") {
      decorated.content = decorateTable(content as Record<string, unknown>);
    } else if (content !== undefined) {
      decorated.content = decorateInline(content);
    }

    if (Array.isArray(block.children)) {
      decorated.children = block.children.map(decorateBlock);
    }

    return decorated;
  };

  return (blocks as unknown as Block[]).map(decorateBlock) as unknown as T[];
}
