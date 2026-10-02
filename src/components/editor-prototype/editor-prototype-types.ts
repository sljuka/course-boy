import type { TestExercise } from "@/components/test-editor-prototype-types";
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

// A live, gradable exercise embedded directly in a document's own content
// flow — distinct from a lesson-attached or standalone test (see "Inline
// quiz blocks" in docs/persistence-notes.md). Reuses the exact `TestExercise`
// shape a test's own exercises use, so the same kind editors/runtimes
// (`src/components/exercise-kinds/`, `src/lib/exercise-kinds/`) apply
// unchanged.
export type ExerciseBlock = {
  exercise: TestExercise;
  id: string;
  type: "exercise";
};

// A block this app version can't read: a block type added by a newer
// version, or an exercise of a kind it doesn't have. Kept exactly as it was
// read (`blockType` is the marker's type name, `source` its body), so saving
// the lesson writes it back unchanged. Students see nothing for it; the
// editor shows a read-only placeholder. See "Lesson block markers" in
// docs/contracts.md.
export type UnknownBlock = {
  blockType: string;
  id: string;
  source: string;
  type: "unknown";
};

export type EditorPrototypeBlock =
  | HeadingBlock
  | MarkdownBlock
  | ImageBlock
  | VideoBlock
  | AudioBlock
  | ExerciseBlock
  | UnknownBlock;

export type EditorPrototypeBlockType = EditorPrototypeBlock["type"];

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
