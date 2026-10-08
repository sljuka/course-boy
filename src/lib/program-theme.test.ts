import { describe, expect, it } from "vitest"

import { contrastRatio, readableTextOn, resolveProgramTheme } from "@/lib/program-theme"

const terminal = { background: "#0b0f0c", foreground: "#d1fae5", primary: "#22c55e" }

describe("program themes", () => {
  it("measures contrast like WCAG, and picks readable text", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0)
    expect(readableTextOn("#7c3aed")).toBe("#ffffff")
    expect(readableTextOn("#facc15")).toBe("#000000")
  })

  it("derives every color from the three core ones, as real colors", () => {
    const resolved = resolveProgramTheme(terminal)!

    expect(resolved.isDark).toBe(true)
    expect(resolved.unreadable).toEqual([])
    expect(resolved.variables["--background"]).toBe("#0b0f0c")
    expect(resolved.variables["--primary-foreground"]).toBe("#000000")
    expect(resolved.variables["--cover-color"]).toBe("#22c55e")
    for (const [name, color] of Object.entries(resolved.variables)) {
      expect(color, name).toMatch(/^#[0-9a-f]{6}$/)
    }
    expect(Object.keys(resolved.variables)).toHaveLength(26)
  })

  it("keeps the teacher's colors where they read", () => {
    const resolved = resolveProgramTheme({ ...terminal, sidebar: "#000000", "sidebar-foreground": "#86efac" })!
    expect(resolved.variables["--sidebar"]).toBe("#000000")
    expect(resolved.unreadable).toEqual([])
  })

  it("applies the teacher's colors as picked, readable or not (the check is off for now)", () => {
    const unreadable = { background: "#ffffff", foreground: "#eeeeee", primary: "#22c55e" }
    expect(resolveProgramTheme(unreadable)!.variables["--foreground"]).toBe("#eeeeee")
    const card = resolveProgramTheme({ ...terminal, card: "#0b0f0c", "card-foreground": "#111111" })!
    expect(card.variables["--card-foreground"]).toBe("#111111")
  })

  it("with the check on, replaces a pair the teacher set that doesn't read, and says which", () => {
    const resolved = resolveProgramTheme(
      { ...terminal, card: "#0b0f0c", "card-foreground": "#111111" },
      { enforceReadability: true },
    )!
    expect(resolved.unreadable).toEqual([{ background: "card", text: "card-foreground" }])
    expect(resolved.variables["--card-foreground"]).toBe("#d1fae5")
  })

  it("with the check on, isn't applied when its text doesn't read on its background", () => {
    expect(
      resolveProgramTheme({ background: "#ffffff", foreground: "#eeeeee", primary: "#22c55e" }, { enforceReadability: true }),
    ).toBeNull()
  })

  it("is light by a light background", () => {
    expect(resolveProgramTheme({ background: "#fbf7ef", foreground: "#1c1917", primary: "#7c3aed" })!.isDark).toBe(false)
  })
})
