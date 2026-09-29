import { describe, expect, it } from "vitest";

import { stripSpacesAfterHardBreaks } from "./blocknote-hard-breaks";

describe("stripSpacesAfterHardBreaks", () => {
  it("drops the space BlockNote's import adds after each line break", () => {
    // What `tryParseMarkdownToBlocks("first line\\\nsecond line\\\nthird line")` returns.
    const blocks = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "first line\n second line\n third line", styles: {} }],
        children: [],
      },
    ];

    expect(stripSpacesAfterHardBreaks(blocks)[0].content[0].text).toBe(
      "first line\nsecond line\nthird line",
    );
  });

  it("handles a break at the end of one styled run and the space at the start of the next", () => {
    const blocks = [
      {
        content: [
          { type: "text", text: "bold line\n", styles: { bold: true } },
          { type: "text", text: " plain line", styles: {} },
        ],
      },
    ];

    stripSpacesAfterHardBreaks(blocks);

    expect(blocks[0].content.map((node) => node.text)).toEqual(["bold line\n", "plain line"]);
  });

  it("reaches text inside links and nested child blocks, and keeps other spaces", () => {
    const blocks = [
      {
        content: [
          { type: "link", href: "https://example.com", content: [{ type: "text", text: "a\n b", styles: {} }] },
        ],
        children: [{ content: [{ type: "text", text: "keep  double  spaces\n  x", styles: {} }] }],
      },
    ];

    stripSpacesAfterHardBreaks(blocks);

    expect(blocks[0].content[0].content[0].text).toBe("a\nb");
    expect(blocks[0].children[0].content[0].text).toBe("keep  double  spaces\nx");
  });
});
