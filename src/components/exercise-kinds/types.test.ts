import { describe, expect, it } from "vitest"

import { validateHasTags } from "@/components/exercise-kinds/types"

describe("validateHasTags", () => {
  it("returns an error when there are no tags", () => {
    expect(validateHasTags({ tagIds: [] })).toEqual({
      message: "Add at least one tag",
      status: "error",
    })
  })

  it("returns null when at least one tag is present", () => {
    expect(validateHasTags({ tagIds: ["easy"] })).toBeNull()
  })
})
