// BlockNote's markdown import reads a hard line break (`line\` + newline, which
// is how its own export writes a line break inside a paragraph) back as "\n"
// followed by a space. Saved again, that space lands in the file, so every
// reload of a pasted multi-line paragraph grew a leading space on lines 2+
// (SLJ-19). CommonMark ignores spaces at the start of the line after a hard
// break, so they never carry meaning and are safe to drop.
//
// Kept free of `@blocknote/core` imports (it needs a DOM) so it can be unit
// tested in Node; `blocknote-translation.ts` applies it after every import.

type InlineNode = { type?: string; text?: string; content?: unknown };
type BlockNode = { content?: unknown; children?: unknown };

function stripInline(nodes: InlineNode[]): void {
  let previousEndedWithBreak = false;

  for (const node of nodes) {
    if (typeof node.text === "string") {
      let text = node.text.replace(/\n[ \t]+/g, "\n");

      if (previousEndedWithBreak) {
        text = text.replace(/^[ \t]+/, "");
      }

      node.text = text;
      previousEndedWithBreak = text.endsWith("\n");
    } else if (Array.isArray(node.content)) {
      // e.g. a link: its own text runs.
      stripInline(node.content as InlineNode[]);
      previousEndedWithBreak = false;
    } else {
      previousEndedWithBreak = false;
    }
  }
}

export function stripSpacesAfterHardBreaks<T extends BlockNode>(blocks: T[]): T[] {
  for (const block of blocks) {
    if (Array.isArray(block.content)) {
      stripInline(block.content as InlineNode[]);
    }

    if (Array.isArray(block.children)) {
      stripSpacesAfterHardBreaks(block.children as BlockNode[]);
    }
  }

  return blocks;
}
