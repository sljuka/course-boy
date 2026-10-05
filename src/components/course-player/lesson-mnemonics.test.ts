import { describe, expect, it } from "vitest";

import { decorateBlocksWithMnemonics } from "./lesson-mnemonics";

const mnemonics = [{ mnemonic: "🍓", showFirst: 2, term: "Newbery" }];
const term = (text: string, styles: Record<string, unknown> = {}) => ({
  content: [{ styles, text, type: "text" }],
  props: { mnemonic: "🍓" },
  type: "mnemonic",
});

describe("decorateBlocksWithMnemonics", () => {
  it("marks each matching term, the first N times across the lesson", () => {
    const blocks = decorateBlocksWithMnemonics(
      [
        { content: "About Newbery", type: "heading" },
        { content: [{ styles: { bold: true }, text: "Newbery wrote.", type: "text" }], type: "paragraph" },
        { content: "Newbery again", type: "paragraph" },
      ],
      mnemonics,
    );

    expect(blocks[0].content).toEqual([
      { styles: {}, text: "About ", type: "text" },
      term("Newbery"),
    ]);
    expect(blocks[1].content).toEqual([
      term("Newbery", { bold: true }),
      { styles: { bold: true }, text: " wrote.", type: "text" },
    ]);
    expect(blocks[2].content).toEqual([{ styles: {}, text: "Newbery again", type: "text" }]);
  });

  it("leaves code, links and exercises alone, and goes into tables and nested blocks", () => {
    const [code, inline, exercise, table, list] = decorateBlocksWithMnemonics(
      [
        { content: "Newbery", type: "codeBlock" },
        {
          content: [
            { styles: { code: true }, text: "Newbery", type: "text" },
            { content: [{ styles: {}, text: "Newbery", type: "text" }], href: "https://x", type: "link" },
          ],
          type: "paragraph",
        },
        { props: { data: "{}" }, type: "exercise" },
        { content: { rows: [{ cells: [{ content: ["Newbery"], type: "tableCell" }] }], type: "tableContent" }, type: "table" },
        { children: [{ content: "Newbery", type: "bulletListItem" }], content: "", type: "bulletListItem" },
      ],
      mnemonics,
    );

    expect(code.content).toBe("Newbery");
    expect(inline.content).toEqual([
      { styles: { code: true }, text: "Newbery", type: "text" },
      { content: [{ styles: {}, text: "Newbery", type: "text" }], href: "https://x", type: "link" },
    ]);
    expect(exercise).toEqual({ props: { data: "{}" }, type: "exercise" });
    expect((table.content as { rows: { cells: { content: unknown }[] }[] }).rows[0].cells[0].content).toEqual([term("Newbery")]);
    expect(list.children?.[0].content).toEqual([term("Newbery")]);
  });

  it("returns the blocks unchanged without mnemonics", () => {
    const blocks = [{ content: "Newbery", type: "paragraph" }];
    expect(decorateBlocksWithMnemonics(blocks, [])).toBe(blocks);
  });
});
