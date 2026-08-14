import { describe, expect, it } from "vitest"

import { slugifyCourseName } from "@/lib/course-slug"

describe("slugifyCourseName", () => {
  it("builds kebab-case slugs from latin titles", () => {
    expect(slugifyCourseName("Introduction to fractions")).toBe(
      "introduction-to-fractions",
    )
  })

  it("removes diacritics from latin titles", () => {
    expect(slugifyCourseName("Uvod u razlomke i једначине")).toBe(
      "uvod-u-razlomke-i-jednacine",
    )
  })

  it("transliterates Serbian Cyrillic before slugging", () => {
    expect(slugifyCourseName("Увод у разломке")).toBe("uvod-u-razlomke")
  })
})
