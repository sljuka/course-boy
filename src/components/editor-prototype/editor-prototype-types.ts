import type { CourseAssetKind } from "@/lib/course-asset-id";
import type { Locale } from "@/lib/i18n";

// The subset of `CourseAssetKind` this document-block editor understands —
// narrower than the full set (e.g. "svg" is region-picker-exercise-specific,
// not an embeddable lesson-content block).
export type DocumentAssetKind = Extract<CourseAssetKind, "audio" | "image" | "video">;

export type HeadingBlock = {
  id: string;
  text: string;
  type: "heading";
};

export type MarkdownBlock = {
  id: string;
  source: string;
  type: "markdown";
};

export type ImageBlock = {
  alt: string;
  caption: string;
  id: string;
  path: string;
  type: "image";
};

export type VideoBlock = {
  caption: string;
  id: string;
  path: string;
  type: "video";
};

export type AudioBlock = {
  caption: string;
  id: string;
  path: string;
  type: "audio";
};

export type EditorPrototypeBlock =
  | HeadingBlock
  | MarkdownBlock
  | ImageBlock
  | VideoBlock
  | AudioBlock;

export type EditorPrototypeBlockType = EditorPrototypeBlock["type"];

export function createPrototypeBlock(
  type: EditorPrototypeBlockType,
): EditorPrototypeBlock {
  const id = crypto.randomUUID();

  switch (type) {
    case "heading":
      return {
        id,
        text: "",
        type,
      };
    case "markdown":
      return {
        id,
        source: "",
        type,
      };
    case "image":
    case "video":
    case "audio":
      throw new Error(
        `"${type}" blocks require an uploaded file and cannot be created empty`,
      );
  }
}

export function createUploadedPrototypeBlock(
  kind: DocumentAssetKind,
  path: string,
): EditorPrototypeBlock {
  const id = crypto.randomUUID();

  switch (kind) {
    case "image":
      return { alt: "", caption: "", id, path, type: kind };
    case "video":
    case "audio":
      return { caption: "", id, path, type: kind };
  }
}

// A brand-new document starts with just its heading block — no example
// content — so the author sees a blank page with only a title to fill in.
export function createInitialDocumentBlocks(
  heading?: string,
  locale: Locale = "en",
): EditorPrototypeBlock[] {
  const localizedHeading = heading ?? getInitialDocumentHeading(locale);

  return [
    {
      id: crypto.randomUUID(),
      text: localizedHeading,
      type: "heading",
    },
  ];
}

function getInitialDocumentHeading(locale: Locale) {
  switch (locale) {
    case "sr":
      return "Naslov dokumenta";
    case "sr-Cyrl":
      return "Наслов документа";
    case "en":
      return "Document title";
  }
}

export const initialPrototypeBlocks: EditorPrototypeBlock[] = [
  {
    id: "markdown-intro",
    source: "",
    type: "markdown",
  },
];
