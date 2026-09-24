import { BlockNoteEditor, type Block, type BlockNoteSchema, type PartialBlock } from "@blocknote/core";

import { documentEditorSchema } from "@/components/editor-prototype/blocknote-schema";
import type {
  EditorPrototypeBlock,
  ImageBlock,
} from "@/components/editor-prototype/editor-prototype-types";
import { matkoAssetUrl } from "@/lib/course-assets";

type DocumentEditorSchema = typeof documentEditorSchema;
type SchemaBlockSchema =
  DocumentEditorSchema extends BlockNoteSchema<infer B, infer _I, infer _S> ? B : never;
type SchemaInlineContentSchema =
  DocumentEditorSchema extends BlockNoteSchema<infer _B, infer I, infer _S> ? I : never;
type SchemaStyleSchema =
  DocumentEditorSchema extends BlockNoteSchema<infer _B, infer _I, infer S> ? S : never;

export type DocumentEditorBlock = Block<
  SchemaBlockSchema,
  SchemaInlineContentSchema,
  SchemaStyleSchema
>;
type DocumentEditorPartialBlock = PartialBlock<
  SchemaBlockSchema,
  SchemaInlineContentSchema,
  SchemaStyleSchema
>;

// A throwaway editor instance purely for its markdown<->blocks conversion
// methods — never mounted, only used here as a local shape-conversion
// helper for `MarkdownBlock`'s arbitrary contiguous runs. Never used for the
// actual persisted format; see the plan's "Architecture" note on why
// BlockNote's own markdown import/export is never used in production. This
// runs in the renderer (a real browser environment), so the plain
// `BlockNoteEditor` works directly — no need for the Node-only
// `@blocknote/server-util` package.
const conversionEditor = BlockNoteEditor.create({ schema: documentEditorSchema });

// The reverse of `matkoAssetUrl` — extracts the bare course-asset filename
// back out of the URL BlockNote's own image/video/audio blocks display and
// store. Falls back to the raw value for anything that isn't one of our own
// asset URLs (e.g. a URL pasted directly into BlockNote's image block,
// which our own block model has no representation for beyond storing it
// as-is — no worse than today, which doesn't support that at all).
function assetPathFromUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "matko-asset:") {
      return url;
    }

    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return url;
  }
}

function markdownRunToBlockNoteBlocks(markdown: string): DocumentEditorPartialBlock[] {
  if (!markdown.trim()) {
    return [];
  }

  return conversionEditor.tryParseMarkdownToBlocks(markdown);
}

function blockNoteBlocksToMarkdownRun(blocks: DocumentEditorBlock[]): string {
  return conversionEditor.blocksToMarkdownLossy(blocks);
}

/**
 * Our own `EditorPrototypeBlock[]` (the canonical, persisted representation
 * — see `lesson-content-markdown.ts`) into BlockNote's own block JSON, for
 * seeding the editor. The inverse of `blockNoteBlocksToEditorPrototype`.
 */
export function editorPrototypeBlocksToBlockNote(
  blocks: EditorPrototypeBlock[],
  courseId: string,
): DocumentEditorPartialBlock[] {
  const result: DocumentEditorPartialBlock[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        result.push({ type: "heading", props: { level: 2 }, content: block.text });
        break;
      case "image":
        result.push({
          type: "image",
          props: {
            caption: block.caption,
            name: block.alt,
            url: matkoAssetUrl(courseId, block.path),
          },
        });
        break;
      case "video":
        result.push({
          type: "video",
          props: { caption: block.caption, url: matkoAssetUrl(courseId, block.path) },
        });
        break;
      case "audio":
        result.push({
          type: "audio",
          props: { caption: block.caption, url: matkoAssetUrl(courseId, block.path) },
        });
        break;
      case "exercise":
        result.push({ type: "exercise", props: { data: JSON.stringify(block.exercise) } });
        break;
      case "markdown":
        result.push(...markdownRunToBlockNoteBlocks(block.source));
        break;
    }
  }

  // BlockNote requires at least one block — an empty lesson body (or one
  // whose only content was a blank `markdown` run) would otherwise produce
  // an empty `initialContent`, which hangs/fails editor creation instead of
  // just rendering a blank document.
  if (result.length === 0) {
    result.push({ type: "paragraph" });
  }

  return result;
}

function extractPlainText(block: DocumentEditorBlock): string {
  if (!Array.isArray(block.content)) {
    return "";
  }

  return block.content
    .map((inlineContent) => ("text" in inlineContent ? inlineContent.text : ""))
    .join("");
}

/**
 * BlockNote's current document back into our own `EditorPrototypeBlock[]`
 * for persistence — the inverse of `editorPrototypeBlocksToBlockNote`.
 * Anything that isn't one of our own structurally-recognized types (the
 * document's first heading, image/video/audio, exercise) is coalesced into
 * contiguous runs and stored as a catch-all `MarkdownBlock`, matching that
 * type's existing role for arbitrary content.
 */
export function blockNoteBlocksToEditorPrototype(
  blocks: DocumentEditorBlock[],
): EditorPrototypeBlock[] {
  const result: EditorPrototypeBlock[] = [];
  let markdownRun: DocumentEditorBlock[] = [];

  function flushMarkdownRun() {
    if (markdownRun.length === 0) {
      return;
    }

    const source = blockNoteBlocksToMarkdownRun(markdownRun);
    result.push({ id: crypto.randomUUID(), source: source.trim(), type: "markdown" });
    markdownRun = [];
  }

  for (const [index, block] of blocks.entries()) {
    const isFirstBlock = index === 0;

    if (isFirstBlock && block.type === "heading") {
      result.push({ id: crypto.randomUUID(), text: extractPlainText(block), type: "heading" });
      continue;
    }

    if (block.type === "image") {
      flushMarkdownRun();
      const image: ImageBlock = {
        alt: (block.props.name as string) ?? "",
        caption: (block.props.caption as string) ?? "",
        id: crypto.randomUUID(),
        path: assetPathFromUrl(block.props.url as string),
        type: "image",
      };
      result.push(image);
      continue;
    }

    if (block.type === "video" || block.type === "audio") {
      flushMarkdownRun();
      result.push({
        caption: (block.props.caption as string) ?? "",
        id: crypto.randomUUID(),
        path: assetPathFromUrl(block.props.url as string),
        type: block.type,
      });
      continue;
    }

    if (block.type === "exercise") {
      flushMarkdownRun();
      const data = block.props.data as string;

      if (data) {
        result.push({ exercise: JSON.parse(data), id: crypto.randomUUID(), type: "exercise" });
      }
      continue;
    }

    markdownRun.push(block);
  }

  flushMarkdownRun();

  return result;
}
