import type {
  EditorPrototypeBlock,
  EditorPrototypeBlockType,
} from "@/components/editor-prototype/editor-prototype-types";

const blockMarkerPattern = /^\[matko-block\]: <> \((heading|markdown)\)$/;

function serializeBlock(block: EditorPrototypeBlock): string {
  const marker = `[matko-block]: <> (${block.type})`;

  switch (block.type) {
    case "heading":
      return `${marker}\n## ${block.text}`;
    case "markdown":
      return `${marker}\n${block.source}`;
  }
}

export function blocksToMarkdown(blocks: EditorPrototypeBlock[]): string {
  return blocks.map(serializeBlock).join("\n\n");
}

function parseBlockContent(
  type: EditorPrototypeBlockType,
  content: string,
): EditorPrototypeBlock {
  const id = crypto.randomUUID();
  const trimmedContent = content.trim();

  switch (type) {
    case "heading":
      return { id, text: trimmedContent.replace(/^#+\s*/, ""), type };
    case "markdown":
      return { id, source: trimmedContent, type };
  }
}

export function markdownToBlocks(markdown: string): EditorPrototypeBlock[] {
  const lines = markdown.split("\n");
  const markerLineIndexes: { index: number; type: EditorPrototypeBlockType }[] = [];

  lines.forEach((line, index) => {
    const match = line.match(blockMarkerPattern);
    if (match) {
      markerLineIndexes.push({ index, type: match[1] as EditorPrototypeBlockType });
    }
  });

  if (markerLineIndexes.length === 0) {
    return [{ id: crypto.randomUUID(), source: markdown.trim(), type: "markdown" }];
  }

  return markerLineIndexes.map(({ index, type }, markerPosition) => {
    const contentStart = index + 1;
    const contentEnd = markerLineIndexes[markerPosition + 1]?.index ?? lines.length;
    const content = lines.slice(contentStart, contentEnd).join("\n");

    return parseBlockContent(type, content);
  });
}
