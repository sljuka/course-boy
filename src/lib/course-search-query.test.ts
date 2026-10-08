import { describe, expect, it } from "vitest"

import { parseCourseSearchQuery } from "@/lib/course-search-query"

describe("parseCourseSearchQuery", () => {
  it("reads plain words as text", () => {
    expect(parseCourseSearchQuery("  Grade 1  Math ")).toEqual({ favoritesOnly: false, text: "grade 1 math" })
  })

  it("takes :favorites (either spelling, any case) out of the text", () => {
    expect(parseCourseSearchQuery(":favorites")).toEqual({ favoritesOnly: true, text: "" })
    expect(parseCourseSearchQuery("math :Favourites")).toEqual({ favoritesOnly: true, text: "math" })
  })

  it("leaves other colon words as text", () => {
    expect(parseCourseSearchQuery(":fav")).toEqual({ favoritesOnly: false, text: ":fav" })
  })
})
