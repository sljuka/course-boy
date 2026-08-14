import type { Locale } from "@/lib/i18n";

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
    {
      id: crypto.randomUUID(),
      source: getInitialDocumentMarkdown(locale),
      type: "markdown",
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
      return "Document heading";
  }
}

function getInitialDocumentMarkdown(locale: Locale) {
  switch (locale) {
    case "sr":
      return "Ovde napiši sadržaj lekcije koristeći Markdown.\n\n## Primeri formatiranja\n\nKoristi **podebljano**, *kurziv* i ~~precrtano~~ za isticanje važnih delova.\n\n- Stavka liste\n- Još jedna stavka sa `inline code`\n- [Primer linka](https://example.com)\n\n1. Numerisani koraci takođe rade\n2. Dobri su za procedure i uputstva\n\n> Blok citati mogu da izdvoje važne napomene.\n\n| Pojam | Primer |\n| --- | --- |\n| Podebljano | `**tekst**` |\n| Kod | `` `vrednost` `` |\n\n```md\n# Naslov\n- Stavka liste\n**Podebljan tekst**\n```";
    case "sr-Cyrl":
      return "Овде напиши садржај лекције користећи Markdown.\n\n## Примери форматирања\n\nКористи **подебљано**, *курзив* и ~~прецртано~~ за истицање важних делова.\n\n- Ставка листе\n- Још једна ставка са `inline code`\n- [Пример линка](https://example.com)\n\n1. Нумерисани кораци такође раде\n2. Добри су за процедуре и упутства\n\n> Блок цитати могу да издвоје важне напомене.\n\n| Појам | Пример |\n| --- | --- |\n| Подебљано | `**текст**` |\n| Код | `` `вредност` `` |\n\n```md\n# Наслов\n- Ставка листе\n**Подебљан текст**\n```";
    case "en":
      return "Write your lesson content here using Markdown.\n\n## Formatting examples\n\nUse **bold**, *italic*, and ~~strikethrough~~ to emphasize ideas.\n\n- Bullet list item\n- Another item with `inline code`\n- [A link example](https://example.com)\n\n1. Ordered steps also work\n2. Great for procedures or instructions\n\n> Blockquotes can call out important notes.\n\n| Concept | Example |\n| --- | --- |\n| Bold | `**text**` |\n| Code | `` `value` `` |\n\n```md\n# Heading\n- List item\n**Bold text**\n```";
  }
}

export const initialPrototypeBlocks: EditorPrototypeBlock[] = [
  {
    id: "markdown-intro",
    source: "",
    type: "markdown",
  },
];
