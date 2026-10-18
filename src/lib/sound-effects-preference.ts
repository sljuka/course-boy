import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { playSoundEffect, warmUpSoundEffects, type SoundEffect, type SoundVolume } from "@/lib/sound-effects";
import { useAppState } from "@/lib/use-app-state";

const queryKey = ["preferences", "soundEffects"] as const;

type SoundSettings = { enabled?: boolean; volume?: SoundVolume };

// Sound effects in tests (SLJ-147), Settings → Interface. Unset, they're on
// for students and off for teachers, so a teacher previewing a course hears
// nothing until they turn them on.
export function useSoundEffectsPreference(): {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: SoundVolume) => void;
  volume: SoundVolume;
} {
  const queryClient = useQueryClient();
  const { role } = useAppState();
  const { data } = useQuery({
    queryKey,
    queryFn: async (): Promise<SoundSettings> => {
      const preferences = await window.preferences.get();
      return { enabled: preferences.soundEffects, volume: preferences.soundVolume };
    },
  });

  const setEnabled = useCallback(
    (enabled: boolean) => {
      queryClient.setQueryData<SoundSettings>(queryKey, (current) => ({ ...current, enabled }));
      void window.preferences.set({ soundEffects: enabled });
    },
    [queryClient],
  );
  const setVolume = useCallback(
    (volume: SoundVolume) => {
      queryClient.setQueryData<SoundSettings>(queryKey, (current) => ({ ...current, volume }));
      void window.preferences.set({ soundVolume: volume });
    },
    [queryClient],
  );

  return {
    enabled: data?.enabled ?? role !== "teacher",
    setEnabled,
    setVolume,
    volume: data?.volume ?? "medium",
  };
}

// What the players call: plays the sound when the setting is on. With it on,
// the audio device opens while the player shows, not on the first answer
// (SLJ-159).
export function useSoundEffects(): (effect: SoundEffect) => void {
  const { enabled, volume } = useSoundEffectsPreference();

  useEffect(() => {
    if (enabled) warmUpSoundEffects();
  }, [enabled]);

  return useCallback(
    (effect: SoundEffect) => {
      if (enabled) playSoundEffect(effect, { volume });
    },
    [enabled, volume],
  );
}
