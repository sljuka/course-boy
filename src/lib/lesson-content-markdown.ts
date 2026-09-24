import type {
  EditorPrototypeBlock,
  EditorPrototypeBlockType,
} from "@/components/editor-prototype/editor-prototype-types";
import {
  fromSharedTestExerciseDefinition,
  toSharedTestExerciseDefinition,
} from "@/components/test-editor-prototype-persistence";

// Keep in sync with `EditorPrototypeBlockType` — see "Lesson block markers
// are a hand-maintained allowlist, not a type" in docs/contracts.md: this
// regex isn't checked against the union, so a new block type that isn't
// added here silently collapses the *entire* lesson body into one opaque
// markdown block on read, with no compile error.
const blockMarkerPattern =
  /^\[matko-block\]: <> \((heading|markdown|image|video|audio|exercise)\)$/;
const imageBlockContentPattern = /^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/;
const linkBlockContentPattern = /^\[([^\]]*)\]\(([^\s)]+)\)$/;

function serializeBlock(block: EditorPrototypeBlock): string {
  const marker = `[matko-block]: <> (${block.type})`;

  switch (block.type) {
    case "heading":
      return `${marker}\n## ${block.text}`;
    case "markdown":
      return `${marker}\n${block.source}`;
    case "image": {
      const captionSuffix = block.caption ? ` "${block.caption}"` : "";

      return `${marker}\n![${block.alt}](${block.path}${captionSuffix})`;
    }
    case "video":
    case "audio":
      return `${marker}\n[${block.caption}](${block.path})`;
    case "exercise":
      return `${marker}\n${JSON.stringify(toSharedTestExerciseDefinition(block.exercise))}`;
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
    case "image": {
      const match = trimmedContent.match(imageBlockContentPattern);

      return {
        alt: match?.[1] ?? "",
        caption: match?.[3] ?? "",
        id,
        path: match?.[2] ?? "",
        type,
      };
    }
    case "video":
    case "audio": {
      const match = trimmedContent.match(linkBlockContentPattern);

      return {
        caption: match?.[1] ?? "",
        id,
        path: match?.[2] ?? "",
        type,
      };
    }
    case "exercise":
      return {
        exercise: fromSharedTestExerciseDefinition(JSON.parse(trimmedContent)),
        id,
        type,
      };
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
