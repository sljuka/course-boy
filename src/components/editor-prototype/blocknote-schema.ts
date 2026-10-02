import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import { exerciseBlockSpec } from "@/components/editor-prototype/exercise-block";
import { unsupportedBlockSpec } from "@/components/editor-prototype/unsupported-block";

// Image/video/audio are BlockNote's own built-in block types — no custom
// spec needed for those (see the translation layer in
// `blocknote-translation.ts` for how they map to/from our own
// `EditorPrototypeBlock` model). `exercise` is our own block; `unsupported`
// holds a block this app version can't read (see `unsupported-block.tsx`).
export const documentEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    exercise: exerciseBlockSpec,
    unsupported: unsupportedBlockSpec,
  },
});
