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

export type DiagramBlock = {
  id: string;
  source: string;
  type: "diagram";
};

export type ImageBlock = {
  alt: string;
  caption: string;
  id: string;
  src: string;
  type: "image";
};

export type VideoBlock = {
  caption: string;
  id: string;
  src: string;
  type: "video";
};

export type EditorPrototypeBlock =
  | HeadingBlock
  | MarkdownBlock
  | DiagramBlock
  | ImageBlock
  | VideoBlock;

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
    case "diagram":
      return {
        id,
        source: "graph TD\n  A[Start] --> B{Question}\n  B -->|Yes| C[Next step]",
        type,
      };
    case "image":
      return {
        alt: "",
        caption: "",
        id,
        src: "",
        type,
      };
    case "video":
      return {
        caption: "",
        id,
        src: "",
        type,
      };
  }
}

export const initialPrototypeBlocks: EditorPrototypeBlock[] = [
  {
    id: "markdown-intro",
    source: "",
    type: "markdown",
  },
];
