import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import { exerciseBlockSpec } from "@/components/editor-prototype/exercise-block";

// Image/video/audio are BlockNote's own built-in block types — no custom
// spec needed for those (see the translation layer in
// `blocknote-translation.ts` for how they map to/from our own
// `EditorPrototypeBlock` model). `exercise` is the one addition.
export const documentEditorSchema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, exercise: exerciseBlockSpec },
});
