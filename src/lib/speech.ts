import type { SpeechLanguage } from "@/lib/exercise-speech";

// Read aloud (SLJ-174) with the system's voices: the Web Speech API in the
// app's window, offline, whatever voices the operating system has (macOS many,
// Windows a few, Linux often none). Which voice reads a language is the
// student's choice (Settings → Interface → Read aloud); unset, the best one on this device.

export type SpeechVoice = { lang: string; localService: boolean; name: string; voiceURI: string };

// Speed: 1 is the system's normal; young readers follow better a bit slower.
export const DEFAULT_SPEECH_RATE = 0.9;
export const SPEECH_RATES = [0.6, 0.75, 0.9, 1, 1.15] as const;

// Which voices fit a language, best first: an exact regional preference, then
// any of the language's own, then close languages (Serbian has no voice on
// macOS or Windows; Croatian and Bosnian read Serbian Latin well).
const VOICE_LANGUAGES: Record<SpeechLanguage, string[]> = {
  de: ["de-DE", "de"],
  en: ["en-GB", "en-US", "en"],
  es: ["es-ES", "es"],
  fr: ["fr-FR", "fr"],
  it: ["it-IT", "it"],
  ru: ["ru-RU", "ru"],
  sr: ["sr", "hr", "bs"],
};

// macOS's novelty voices (singing, whispering, robots): choosable, never the default.
const NOVELTY_VOICES = new Set([
  "Albert", "Bad News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos", "Good News", "Jester", "Junior",
  "Organ", "Ralph", "Superstar", "Trinoids", "Whisper", "Wobble", "Zarvox",
]);

const baseName = (voice: SpeechVoice) => voice.name.replace(/\s*\(.*\)$/, "");

function matchRank(voice: SpeechVoice, language: SpeechLanguage): number {
  const tags = VOICE_LANGUAGES[language];
  const lang = voice.lang.replace("_", "-");
  const index = tags.findIndex((tag) => (tag.includes("-") ? lang === tag : lang.split("-")[0] === tag));
  return index;
}

// The voices that can read a language, best first.
export function voicesFor(voices: SpeechVoice[], language: SpeechLanguage): SpeechVoice[] {
  return voices
    .map((voice) => ({ rank: matchRank(voice, language), voice }))
    .filter(({ rank }) => rank !== -1)
    .sort(
      (a, b) =>
        Number(NOVELTY_VOICES.has(baseName(a.voice))) - Number(NOVELTY_VOICES.has(baseName(b.voice))) ||
        a.rank - b.rank ||
        Number(b.voice.localService) - Number(a.voice.localService),
    )
    .map(({ voice }) => voice);
}

// The voice for a language: the student's choice if this device has it, else
// the best fit, else none (then nothing is read aloud).
export function pickVoice(voices: SpeechVoice[], language: SpeechLanguage, chosenVoiceURI?: string): SpeechVoice | null {
  const fitting = voicesFor(voices, language);
  return fitting.find((voice) => voice.voiceURI === chosenVoiceURI) ?? fitting[0] ?? null;
}

// What's said for a piece of exercise text (Markdown): no markup, a blank
// ({{…}}) as a pause.
export function speechText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "…")
    .replace(/[*_`#>~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Speaks `text` with `voice` at `rate`, stopping whatever was being read.
export function speak(text: string, { rate, voice }: { rate: number; voice: SpeechVoice }): void {
  const synthesis = window.speechSynthesis;
  if (!synthesis || !text) return;
  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const systemVoice = synthesis.getVoices().find((candidate) => candidate.voiceURI === voice.voiceURI);
  if (systemVoice) utterance.voice = systemVoice;
  utterance.lang = voice.lang;
  utterance.rate = rate;
  synthesis.speak(utterance);
}

// The system's voices; Chromium lists them only after `voiceschanged`.
export function loadVoices(): Promise<SpeechVoice[]> {
  const synthesis = typeof window === "undefined" ? undefined : window.speechSynthesis;
  if (!synthesis) return Promise.resolve([]);
  const read = () =>
    synthesis.getVoices().map(({ lang, localService, name, voiceURI }) => ({ lang, localService, name, voiceURI }));
  const now = read();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      synthesis.removeEventListener("voiceschanged", done);
      clearTimeout(timer);
      resolve(read());
    };
    const timer = setTimeout(done, 3000);
    synthesis.addEventListener("voiceschanged", done);
  });
}

// What the Test button in Settings → Interface → Read aloud says in each language: spoken
// content in that language, not interface text, so it isn't translated.
export const SPEECH_SAMPLES: Record<SpeechLanguage, string> = {
  de: "Hallo! Das ist meine Stimme.",
  en: "Hello! Where is the blue kid? It's under the desk.",
  es: "¡Hola! Esta es mi voz.",
  fr: "Bonjour ! Voici ma voix.",
  it: "Ciao! Questa è la mia voce.",
  ru: "Привет! Это мой голос.",
  sr: "Zdravo! Ovo je moj glas.",
};
