// Read aloud (SLJ-174): an exercise can have its question and options spoken
// in the system's voice. On disk, on the exercise definition (a test's JSON
// and an inline exercise block in a lesson alike):
//
//   speech: { lang: "en" }
//
// `lang` is the language the exercise's text is in, so the student's voice for
// that language reads it ("under" by an English voice, not a Serbian one). It
// isn't a voice: the voice and the speed are the student's (Settings → Interface → Read aloud,
// lib/speech.ts). Missing `speech` means the exercise isn't read aloud. Pure:
// used by the renderer and the main process.

// The languages a teacher can mark an exercise's text as. Codes as in BCP 47;
// a voice matches by its language's first part ("en-GB" for "en").
export const SPEECH_LANGUAGES = ["en", "sr", "de", "fr", "es", "it", "ru"] as const;

export type SpeechLanguage = (typeof SPEECH_LANGUAGES)[number];

export type ExerciseSpeech = { lang: SpeechLanguage };

// What every exercise kind can have (alongside its points).
export type ExerciseSpeechField = { speech?: ExerciseSpeech };

export function isSpeechLanguage(value: unknown): value is SpeechLanguage {
  return typeof value === "string" && (SPEECH_LANGUAGES as readonly string[]).includes(value);
}

export function isValidExerciseSpeech(value: unknown): value is ExerciseSpeech {
  return Boolean(value) && typeof value === "object" && isSpeechLanguage((value as { lang?: unknown }).lang);
}

// The speech part of an exercise definition, checked on every read and save
// alongside the kind's own guard: absent or well-formed.
export function hasValidExerciseSpeech(exercise: Record<string, unknown>): boolean {
  return exercise.speech === undefined || isValidExerciseSpeech(exercise.speech);
}

// The field as written: only when set, so an exercise without it is as before.
export function exerciseSpeechField(speech: ExerciseSpeech | undefined): ExerciseSpeechField {
  return speech ? { speech: { lang: speech.lang } } : {};
}

// The language an exercise (in any of its forms: on disk, in the editor, in
// the player) is read aloud in, if it is: its question and options get a 🔊.
// Not for Listen and choose (SLJ-175): its speech is the hidden text, played by
// its own button; its instruction and options aren't read aloud.
export function exerciseSpeechLanguage(exercise: object): SpeechLanguage | undefined {
  if ((exercise as { kind?: unknown }).kind === "listen-choose") return undefined;
  return spokenLanguage(exercise);
}

// The language of an exercise's `speech`, whatever its kind.
export function spokenLanguage(exercise: object): SpeechLanguage | undefined {
  const speech = (exercise as ExerciseSpeechField).speech;
  return isValidExerciseSpeech(speech) ? speech.lang : undefined;
}
