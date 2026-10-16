// Short sounds for students (SLJ-147): a right answer, a wrong one, the end
// of a test, and a celebration. Made here with the Web Audio API rather than
// shipped as audio files: nothing to load (the first sound is never late)
// and nothing to license.
//
// Players don't call this directly but `useSoundEffects` (in
// sound-effects-preference.ts), which plays only when the person's setting
// is on and at their volume.

export type SoundEffect = "celebrate" | "done" | "right" | "wrong";

export type SoundVolume = "quiet" | "medium" | "loud";

export const SOUND_VOLUMES: readonly SoundVolume[] = [
  "quiet",
  "medium",
  "loud",
];

const GAIN: Record<SoundVolume, number> = {
  loud: 0.5,
  medium: 0.25,
  quiet: 0.1,
};

// Fired on `window` for every sound played, so the e2e suite can tell which
// sound played without real audio.
export const SOUND_EFFECT_EVENT = "matko:sound-effect";

// A note: its pitch in semitones from A4 (440 Hz), when it starts and how
// long it rings, in seconds, and how loud next to the others (1 when unset).
type Note = { at: number; gain?: number; length: number; semitones: number };

// Overtones over each note (a multiple of its pitch, and how loud): a bell's
// shimmer. Without them, a note is a single pure tone.
type Partial = { gain: number; ratio: number };
const PURE: Partial[] = [{ gain: 1, ratio: 1 }];
// A xylophone bar is cut so its strongest overtone sits at three times its
// pitch, with a fainter one higher up; both die fast. That, and the
// mallet's click, is what makes it sound like wood rather than a bell.
const XYLOPHONE: Partial[] = [
  { gain: 1, ratio: 1 },
  { gain: 0.45, ratio: 3 },
  { gain: 0.12, ratio: 6.3 },
];

// Right is a xylophone, wrong comes gently down a small step (never a
// buzzer), done is a short major arpeggio and celebrate the same one
// climbing higher.
// `mallet`: each note starts with a hard mallet's click, a few milliseconds
// of bright noise.
const NOTES: Record<
  SoundEffect,
  {
    mallet?: boolean;
    notes: Note[];
    partials?: Partial[];
    wave: OscillatorType;
  }
> = {
  celebrate: {
    notes: [
      { at: 0, length: 0.14, semitones: 3 },
      { at: 0.1, length: 0.14, semitones: 7 },
      { at: 0.2, length: 0.14, semitones: 10 },
      { at: 0.3, length: 0.5, semitones: 15 },
    ],
    wave: "square",
  },
  done: {
    notes: [
      { at: 0, length: 0.16, semitones: 3 },
      { at: 0.12, length: 0.16, semitones: 7 },
      { at: 0.24, length: 0.4, semitones: 10 },
    ],
    wave: "sine",
  },
  // A quick xylophone phrase, then a short echo going down and fading
  // away. The same every time.
  right: {
    mallet: true,
    notes: [
      { at: 0, gain: 0.9, length: 0.26, semitones: 11 }, // 11 9 good
      { at: 0.12, gain: 0.6, length: 0.26, semitones: 9 },
      { at: 0.23, gain: 0.4, length: 0.26, semitones: 11 },
      { at: 0.3, gain: 0.3, length: 0.4, semitones: 7 },
      // An echo, fading away.
      { at: 1.33, gain: 0.1, length: 0.04, semitones: 1 },
      { at: 1.41, gain: 0.2, length: 0.04, semitones: 2 },
      { at: 1.49, gain: 0.1, length: 0.04, semitones: 3 },
      { at: 1.57, gain: 0.07, length: 0.04, semitones: 2 },
    ],
    partials: XYLOPHONE,
    wave: "sine",
  },
  wrong: {
    notes: [
      { at: 0, length: 0.16, semitones: -2 },
      { at: 0.12, length: 0.3, semitones: -5 },
    ],
    wave: "sine",
  },
};

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (context) return context;
  if (typeof AudioContext === "undefined") return null;
  context = new AudioContext();
  return context;
}

export function playSoundEffect(
  effect: SoundEffect,
  { volume }: { volume: SoundVolume },
) {
  window.dispatchEvent(
    new CustomEvent(SOUND_EFFECT_EVENT, { detail: { effect } }),
  );

  const audio = audioContext();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();

  const { mallet = false, notes, partials = PURE, wave } = NOTES[effect];
  const start = audio.currentTime + 0.01;
  // The overtones share the volume, so a bell isn't louder than a tone.
  const total = partials.reduce((sum, partial) => sum + partial.gain, 0);

  for (const note of notes) {
    const from = start + note.at;
    const level = GAIN[volume] * (note.gain ?? 1);
    for (const partial of partials) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = wave;
      oscillator.frequency.value =
        440 * 2 ** (note.semitones / 12) * partial.ratio;
      // A quick attack and a fading tail, so no note clicks or ends
      // abruptly; higher overtones fade sooner, as a struck bar's do.
      const peak = (level * partial.gain) / total;
      const end = from + note.length / partial.ratio ** 0.7;
      gain.gain.setValueAtTime(0.0001, from);
      gain.gain.exponentialRampToValueAtTime(
        peak,
        from + (mallet ? 0.002 : 0.008),
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(from);
      oscillator.stop(end + 0.05);
    }
    if (mallet) malletClick(audio, from, level * 0.35);
  }
}

// A hard mallet hitting the bar: a burst of noise, kept to the bright
// middle band and gone in about 15 milliseconds.
function malletClick(audio: AudioContext, at: number, peak: number) {
  const length = Math.ceil(audio.sampleRate * 0.02);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1)
    samples[index] = Math.random() * 2 - 1;

  const noise = audio.createBufferSource();
  noise.buffer = buffer;
  const band = audio.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 3500;
  band.Q.value = 1.2;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(peak, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.015);
  noise.connect(band).connect(gain).connect(audio.destination);
  noise.start(at);
}
