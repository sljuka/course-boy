import { describe, expect, it } from "vitest"

import { pickVoice, speechText, type SpeechVoice, voicesFor } from "@/lib/speech"

// SLJ-174: which of the device's voices reads a language.
const voice = (name: string, lang: string, localService = true): SpeechVoice => ({ lang, localService, name, voiceURI: `${name}-${lang}` })

const mac = [
  voice("Samantha", "en-US"),
  voice("Bubbles", "en-US"),
  voice("Daniel (English (United Kingdom))", "en-GB"),
  voice("Moira", "en-IE"),
  voice("Lana", "hr-HR"),
  voice("Thomas", "fr-FR"),
]

describe("voicesFor / pickVoice", () => {
  it("prefers British English, then American, then any English, never a novelty voice first", () => {
    expect(voicesFor(mac, "en").map((v) => v.name)).toEqual([
      "Daniel (English (United Kingdom))",
      "Samantha",
      "Moira",
      "Bubbles",
    ])
    expect(pickVoice(mac, "en")?.name).toBe("Daniel (English (United Kingdom))")
  })

  it("keeps the student's choice when this device has it", () => {
    expect(pickVoice(mac, "en", "Moira-en-IE")?.name).toBe("Moira")
    expect(pickVoice(mac, "en", "Gone-en-GB")?.name).toBe("Daniel (English (United Kingdom))")
  })

  it("reads Serbian with a Croatian voice when there's no Serbian one, and gives up when nothing fits", () => {
    expect(pickVoice(mac, "sr")?.name).toBe("Lana")
    expect(pickVoice(mac, "de")).toBeNull()
  })
})

describe("speechText", () => {
  it("says the words, not the markup, and a blank as a pause", () => {
    expect(speechText("Where is the **blue kid**? It's `under` the {{b1}}.")).toBe("Where is the blue kid? It's under the ….")
    expect(speechText("[Open](matko://lesson/x) the ![door](door.png) door")).toBe("Open the door")
  })
})
