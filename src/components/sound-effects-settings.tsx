import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { playSoundEffect, SOUND_VOLUMES, type SoundVolume } from "@/lib/sound-effects";
import { useSoundEffectsPreference } from "@/lib/sound-effects-preference";

// Settings → Interface (SLJ-147): sound effects in tests on or off, and how
// loud. Picking a volume plays a right answer's sound at it.
export function SoundEffectsSettings() {
  const { t } = useTranslation();
  const { enabled, setEnabled, setVolume, volume } = useSoundEffectsPreference();

  // One row of the settings card, the volume under its checkbox.
  return (
    <div className="flex flex-col gap-4">
      <FieldLabel htmlFor="settings-sound-effects">
        <Field orientation="horizontal">
          <Checkbox
            checked={enabled}
            data-testid="settings-sound-effects"
            id="settings-sound-effects"
            onCheckedChange={(checked) => setEnabled(checked === true)}
          />
          <FieldContent>
            <FieldTitle>{t("settings.interface.soundEffects")}</FieldTitle>
            <FieldDescription>{t("settings.interface.soundEffectsDescription")}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
      {enabled && (
        <Field className="gap-8 has-[>[data-slot=field-content]]:items-center" orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="settings-sound-volume">{t("settings.interface.soundVolume")}</FieldLabel>
          </FieldContent>
          <Select
            onValueChange={(value) => {
              if (value === null) return;
              setVolume(value as SoundVolume);
              playSoundEffect("right", { volume: value as SoundVolume });
            }}
            value={volume}
          >
            <SelectTrigger className="w-32 shrink-0" id="settings-sound-volume">
              <SelectValue>{(value: SoundVolume) => t(`settings.interface.soundVolumes.${value}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SOUND_VOLUMES.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`settings.interface.soundVolumes.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}
