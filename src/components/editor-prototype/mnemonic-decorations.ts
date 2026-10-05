import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import { mnemonicTermDecorationClassName } from "@/components/ui/mnemonic-term";
import { createMnemonicMatcher, type CourseMnemonic } from "@/lib/mnemonics";

// The teacher's view of course mnemonics while writing (SLJ-37): the same
// terms students will see marked (the first N in the document, skipping code,
// links and exercises, like `decorateBlocksWithMnemonics`) are underlined,
// with the mnemonic in a tooltip on hover. ProseMirror decorations are drawn
// over the document and never become part of it, so nothing is saved.

type ProseMirrorNode = EditorState["doc"];

const pluginKey = new PluginKey<DecorationSet>("matko-mnemonics");
const SKIPPED_BLOCKS = new Set(["codeBlock", "exercise", "unsupported"]);

function buildDecorations(doc: ProseMirrorNode, mnemonics: CourseMnemonic[]): DecorationSet {
  if (mnemonics.length === 0) {
    return DecorationSet.empty;
  }

  const matcher = createMnemonicMatcher(mnemonics);
  const decorations: Decoration[] = [];

  doc.descendants((node, position) => {
    if (SKIPPED_BLOCKS.has(node.type.name)) {
      return false;
    }

    if (!node.isText || !node.text || node.marks.some((mark) => mark.type.name === "code" || mark.type.name === "link")) {
      return true;
    }

    let offset = 0;
    for (const segment of matcher.split(node.text)) {
      if ("mnemonic" in segment) {
        decorations.push(
          Decoration.inline(position + offset, position + offset + segment.text.length, {
            class: mnemonicTermDecorationClassName,
            "data-mnemonic": segment.mnemonic,
            "data-testid": "editor-mnemonic",
          }),
        );
      }
      offset += segment.text.length;
    }
    return true;
  });

  return DecorationSet.create(doc, decorations);
}

// `getMnemonics` is read whenever the document changes; after the list itself
// changes, call `refreshMnemonicDecorations`.
export function mnemonicDecorationsExtension(getMnemonics: () => CourseMnemonic[]) {
  return createExtension({
    key: "mnemonicDecorations",
    prosemirrorPlugins: [
      new Plugin<DecorationSet>({
        key: pluginKey,
        props: {
          decorations: (state: EditorState) => pluginKey.getState(state),
        },
        state: {
          apply: (transaction, previous) =>
            transaction.docChanged || transaction.getMeta(pluginKey)
              ? buildDecorations(transaction.doc, getMnemonics())
              : previous.map(transaction.mapping, transaction.doc),
          init: (_config, state) => buildDecorations(state.doc, getMnemonics()),
        },
      }),
    ],
  });
}

export function refreshMnemonicDecorations(editor: { transact: (callback: (transaction: Transaction) => void) => void }) {
  editor.transact((transaction) => {
    transaction.setMeta(pluginKey, true);
  });
}
