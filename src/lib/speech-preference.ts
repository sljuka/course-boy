import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { SpeechLanguage } from "@/lib/exercise-speech";
import { DEFAULT_SPEECH_RATE, loadVoices, pickVoice, speak, speechText, type SpeechVoice } from "@/lib/speech";

const preferenceKey = ["preferences", "speech"] as const;
const voicesKey = ["speech", "voices"] as const;

type SpeechSettings = { rate?: number; voices?: Partial<Record<SpeechLanguage, string>> };

// The system's voices on this device (SLJ-174), read once, and only when
// something is to be read: the system's speech service isn't touched otherwise.
export function useSystemVoices(enabled = true): SpeechVoice[] | undefined {
  const { data } = useQuery({ enabled, queryFn: loadVoices, queryKey: voicesKey, staleTime: Infinity });
  return data;
}

// Settings → Sound: the voice chosen for each language and the speed.
export function useSpeechPreference(enabled = true): {
  chosenVoices: Partial<Record<SpeechLanguage, string>>;
  rate: number;
  setRate: (rate: number) => void;
  setVoice: (language: SpeechLanguage, voiceURI: string) => void;
} {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    enabled,
    queryKey: preferenceKey,
    queryFn: async (): Promise<SpeechSettings> => {
      const preferences = await window.preferences.get();
      return { rate: preferences.speechRate, voices: preferences.speechVoices };
    },
  });
  const chosenVoices = data?.voices ?? {};

  const setVoice = useCallback(
    (language: SpeechLanguage, voiceURI: string) => {
      const voices = { ...queryClient.getQueryData<SpeechSettings>(preferenceKey)?.voices, [language]: voiceURI };
      queryClient.setQueryData<SpeechSettings>(preferenceKey, (current) => ({ ...current, voices }));
      void window.preferences.set({ speechVoices: voices });
    },
    [queryClient],
  );
  const setRate = useCallback(
    (rate: number) => {
      queryClient.setQueryData<SpeechSettings>(preferenceKey, (current) => ({ ...current, rate }));
      void window.preferences.set({ speechRate: rate });
    },
    [queryClient],
  );

  return { chosenVoices, rate: data?.rate ?? DEFAULT_SPEECH_RATE, setRate, setVoice };
}

// What the players use: reads Markdown text in a language with the student's
// voice and speed. Null when this device has no voice for the language (the
// 🔊 is then left out).
export function useReadAloud(language: SpeechLanguage | undefined): ((markdown: string) => void) | null {
  const voices = useSystemVoices(Boolean(language));
  const { chosenVoices, rate } = useSpeechPreference(Boolean(language));
  const voice = language && voices ? pickVoice(voices, language, chosenVoices[language]) : null;

  const read = useCallback(
    (markdown: string) => {
      if (voice) speak(speechText(markdown), { rate, voice });
    },
    [rate, voice],
  );

  return voice ? read : null;
}
