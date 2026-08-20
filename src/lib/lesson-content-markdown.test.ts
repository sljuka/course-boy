import { describe, expect, it } from "vitest"

import { blocksToMarkdown, markdownToBlocks } from "@/lib/lesson-content-markdown"
import type { EditorPrototypeBlock } from "@/components/editor-prototype/editor-prototype-types"

describe("blocksToMarkdown / markdownToBlocks", () => {
  it("round-trips a heading block", () => {
    const blocks: EditorPrototypeBlock[] = [
      { id: "1", text: "Section heading", type: "heading" },
    ]

    const roundTripped = markdownToBlocks(blocksToMarkdown(blocks))

    expect(roundTripped).toMatchObject([{ text: "Section heading", type: "heading" }])
  })

  it("round-trips a markdown block", () => {
    const blocks: EditorPrototypeBlock[] = [
      { id: "1", source: "Some **bold** text.\n\n- one\n- two", type: "markdown" },
    ]

    const roundTripped = markdownToBlocks(blocksToMarkdown(blocks))

    expect(roundTripped).toMatchObject([
      { source: "Some **bold** text.\n\n- one\n- two", type: "markdown" },
    ])
  })

  it("round-trips a full multi-block document in order", () => {
    const blocks: EditorPrototypeBlock[] = [
      { id: "1", text: "Intro", type: "heading" },
      { id: "2", source: "Some content.", type: "markdown" },
    ]

    const roundTripped = markdownToBlocks(blocksToMarkdown(blocks))

    expect(roundTripped.map((block) => block.type)).toEqual([
      "heading",
      "markdown",
    ])
  })

  it("falls back to a single markdown block for unmarked content", () => {
    const roundTripped = markdownToBlocks("# Hand-written heading\n\nSome body text.")

    expect(roundTripped).toMatchObject([
      { source: "# Hand-written heading\n\nSome body text.", type: "markdown" },
    ])
  })

  it("falls back to a single empty markdown block for empty content", () => {
    expect(markdownToBlocks("")).toMatchObject([{ source: "", type: "markdown" }])
  })
})
