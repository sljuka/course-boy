import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import { exerciseBlockSpec } from "@/components/editor-prototype/exercise-block";
import { timelineBlockSpec } from "@/components/editor-prototype/timeline-block";
import { unsupportedBlockSpec } from "@/components/editor-prototype/unsupported-block";

// Image/video/audio are BlockNote's own built-in block types — no custom
// spec needed for those (see the translation layer in
// `blocknote-translation.ts` for how they map to/from our own
// `EditorPrototypeBlock` model). `exercise` and `timeline` (SLJ-35) are our own blocks; `unsupported`
// holds a block this app version can't read (see `unsupported-block.tsx`).
export const documentEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    exercise: exerciseBlockSpec,
    timeline: timelineBlockSpec,
    unsupported: unsupportedBlockSpec,
  },
});
