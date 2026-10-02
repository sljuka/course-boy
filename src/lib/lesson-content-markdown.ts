import type {
  EditorPrototypeBlock,
  ExerciseBlock,
  UnknownBlock,
} from "@/components/editor-prototype/editor-prototype-types";
import {
  fromSharedTestExerciseDefinition,
  toSharedTestExerciseDefinition,
} from "@/components/test-editor-prototype-persistence";
import {
  BLOCK_MARKER_PATTERN,
  type KnownBlockType,
  blockMarker,
  isKnownBlockType,
} from "@/lib/lesson-block-markers";

const imageBlockContentPattern = /^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/;
const linkBlockContentPattern = /^\[([^\]]*)\]\(([^\s)]+)\)$/;

function serializeBlock(block: EditorPrototypeBlock): string {
  if (block.type === "unknown") {
    return `${blockMarker(block.blockType)}\n${block.source}`;
  }

  const marker = blockMarker(block.type);

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

function parseBlockContent(type: string, content: string): EditorPrototypeBlock {
  if (!isKnownBlockType(type)) {
    return unknownBlock(type, content);
  }

  return parseKnownBlockContent(type, content);
}

function unknownBlock(blockType: string, content: string): UnknownBlock {
  return { blockType, id: crypto.randomUUID(), source: content.trim(), type: "unknown" };
}

function parseKnownBlockContent(type: KnownBlockType, content: string): EditorPrototypeBlock {
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
      return parseExerciseBlock(id, trimmedContent) ?? unknownBlock(type, content);
  }
}

// An exercise this version can't read (a kind added by a newer version, or
// JSON it can't parse) is kept as an unknown block rather than failing the
// whole lesson.
function parseExerciseBlock(id: string, content: string): ExerciseBlock | null {
  try {
    return {
      exercise: fromSharedTestExerciseDefinition(JSON.parse(content)),
      id,
      type: "exercise",
    };
  } catch {
    return null;
  }
}

export function markdownToBlocks(markdown: string): EditorPrototypeBlock[] {
  const lines = markdown.split("\n");
  const markerLineIndexes: { index: number; type: string }[] = [];

  lines.forEach((line, index) => {
    const match = line.match(BLOCK_MARKER_PATTERN);
    if (match) {
      markerLineIndexes.push({ index, type: match[1] });
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

export function hasUnknownBlocks(blocks: EditorPrototypeBlock[]): boolean {
  return blocks.some((block) => block.type === "unknown");
}
