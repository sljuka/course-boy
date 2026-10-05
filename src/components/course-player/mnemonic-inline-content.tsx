import { BlockNoteSchema, defaultInlineContentSpecs } from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";

import { documentEditorSchema } from "@/components/editor-prototype/blocknote-schema";
import { MnemonicInline } from "@/components/course-player/mnemonic-inline";

// A term with a course mnemonic in a lesson (SLJ-37): the term's text is its
// content, marked, with the mnemonic in a tooltip. Render-only: it's
// added by `decorateBlocksWithMnemonics` when the student views a lesson and
// is never part of a saved lesson, so only the player's schema has it.
const mnemonicInlineContentSpec = createReactInlineContentSpec(
  {
    content: "styled",
    propSchema: { mnemonic: { default: "" } },
    type: "mnemonic",
  },
  {
    render: ({ contentRef, inlineContent }) => (
      <MnemonicInline mnemonic={inlineContent.props.mnemonic}>
        <span ref={contentRef} />
      </MnemonicInline>
    ),
  },
);

// The editor's schema plus the mnemonic term, for the read-only lesson view.
export const lessonPlayerSchema = BlockNoteSchema.create({
  blockSpecs: documentEditorSchema.blockSpecs,
  inlineContentSpecs: { ...defaultInlineContentSpecs, mnemonic: mnemonicInlineContentSpec },
  styleSpecs: documentEditorSchema.styleSpecs,
});
