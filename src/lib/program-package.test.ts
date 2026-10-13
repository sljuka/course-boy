import { describe, expect, it } from "vitest"

import {
  programCourseFromManifest,
  isNewerProgramFormat,
  isProgramManifest,
  localizeProgram,
  type ProgramManifest,
} from "@/lib/program-package"

function program(overrides: Partial<ProgramManifest> = {}): ProgramManifest {
  return {
    banner: null,
    courses: [
      {
        code: "55cgbt6rwrz5zzzy6i4rb9sn8i13api9trbba5ke1uuxg8s5ngpo",
        courseId: "cnp2svlf5w2xxdl3",
        snapshot: {
          locales: { en: { description: "Caesar to Enigma.", title: "Classical ciphers" } },
          publisherId: "pxxzcf3g",
          supportedLocales: ["en"],
          version: "0.3.0",
        },
      },
    ],
    defaultLocale: "en",
    formatVersion: 1,
    id: "k3m7abcdefgh2345",
    locales: { en: { description: "From the mailing list to Bitcoin.", title: "Cypherpunks" } },
    logo: "logo-3fa1c2d9e8b7a6f5.png",
    supportedLocales: ["en", "sr"],
    theme: { accent: "#fef3c7", background: "#0b0f0c", foreground: "#d1fae5", primary: "#22c55e" },
    updatedAt: "2026-10-08T12:00:00.000Z",
    ...overrides,
  }
}

describe("isProgramManifest", () => {
  it("accepts a well-formed program, with or without logo, banner, theme and courses", () => {
    expect(isProgramManifest(program())).toBe(true)
    expect(isProgramManifest(program({ banner: null, courses: [], logo: null, theme: null }))).toBe(true)
  })

  // SLJ-31: a channel is a program marked "channel", which can list programs.
  it("accepts a channel with its programs, and refuses another kind or a bad entry", () => {
    const listed = {
      code: "55cgbt6rwrz5zzzy6i4rb9sn8i13api9trbba5ke1uuxg8s5ngpo",
      programId: "k3m7abcdefgh2346",
      snapshot: { locales: { en: { description: "", title: "Cypherpunks" } } },
    }
    expect(isProgramManifest(program({ kind: "channel", programs: [listed] }))).toBe(true)
    expect(isProgramManifest({ ...program(), kind: "playlist" })).toBe(false)
    expect(isProgramManifest(program({ kind: "channel", programs: [{ ...listed, programId: "../x" }] }))).toBe(false)
    expect(isProgramManifest(program({ kind: "channel", programs: [{ ...listed, code: "nope" }] }))).toBe(false)
  })

  it("accepts a course of your own not published yet (no code)", () => {
    const [course] = program().courses
    expect(isProgramManifest(program({ courses: [{ ...course, code: null }] }))).toBe(true)
  })

  it("refuses what could hurt or mislead: paths, bad colors, unknown languages, duplicates", () => {
    expect(isProgramManifest(program({ logo: "../../etc/passwd" }))).toBe(false)
    expect(isProgramManifest(program({ theme: { background: "#000000", foreground: "white", primary: "#7c3aed" } }))).toBe(false)
    expect(isProgramManifest({ ...program(), theme: { background: "#000000", primary: "#7c3aed" } })).toBe(false)
    expect(isProgramManifest({ ...program(), theme: { background: "#000000", foreground: "#ffffff", primary: "#7c3aed", position: "#000000" } })).toBe(false)
    expect(isProgramManifest({ ...program(), locales: { xx: { description: "", title: "?" } } })).toBe(false)
    expect(isProgramManifest(program({ defaultLocale: "sr-Cyrl" }))).toBe(false)
    const [course] = program().courses
    expect(isProgramManifest(program({ courses: [course, course] }))).toBe(false)
    expect(isProgramManifest(program({ courses: [{ ...course, courseId: "../x" }] }))).toBe(false)
    expect(isProgramManifest({ ...program(), id: "not an id" })).toBe(false)
  })

  it("tells a program from a newer Matko apart from a damaged one", () => {
    expect(isProgramManifest({ ...program(), formatVersion: 2 })).toBe(false)
    expect(isNewerProgramFormat({ ...program(), formatVersion: 2 })).toBe(true)
    expect(isNewerProgramFormat({ formatVersion: "2" })).toBe(false)
  })
})

describe("localizeProgram", () => {
  it("uses the reader's language, then the default one when it isn't written", () => {
    const manifest = program({
      locales: { en: { description: "d", title: "Cypherpunks" }, sr: { description: "", title: " " } },
    })
    expect(localizeProgram(manifest, "sr").title).toBe("Cypherpunks")
    expect(localizeProgram(manifest, "en").title).toBe("Cypherpunks")
  })
})

describe("programCourseFromManifest", () => {
  const code = "55cgbt6rwrz5zzzy6i4rb9sn8i13api9trbba5ke1uuxg8s5ngpo"

  it("keeps a course's titles and descriptions in its languages", () => {
    expect(
      programCourseFromManifest(
        code,
        {
          id: "cnp2svlf5w2xxdl3",
          locales: { en: { description: "Caesar to Enigma.", title: "Classical ciphers" }, xx: { title: "?" } },
          supportedLocales: ["en", "xx"],
          version: "0.3.0",
        },
        "pxxzcf3g",
      ),
    ).toEqual({
      code,
      courseId: "cnp2svlf5w2xxdl3",
      snapshot: {
        locales: { en: { description: "Caesar to Enigma.", title: "Classical ciphers" } },
        publisherId: "pxxzcf3g",
        supportedLocales: ["en"],
        version: "0.3.0",
      },
    })
  })

  it("refuses what isn't a course", () => {
    expect(programCourseFromManifest(code, { id: "../x", locales: {}, supportedLocales: ["en"] }, null)).toBeNull()
    expect(programCourseFromManifest(code, null, null)).toBeNull()
  })
})
