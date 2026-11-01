import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SPEECH_LANGUAGES, type SpeechLanguage } from "@/lib/exercise-speech";
import { pickVoice, speak, SPEECH_RATES, SPEECH_SAMPLES, type SpeechVoice, voicesFor } from "@/lib/speech";
import { useSpeechPreference, useSystemVoices } from "@/lib/speech-preference";

// The languages always offered; the others under "More languages".
const MAIN_LANGUAGES: SpeechLanguage[] = ["en", "sr"];

// Settings → Interface → Read aloud (SLJ-174): which of this device's voices reads exercises
// in each language, how fast, and a Test button. The voices are the operating
// system's, so they differ between devices; unset, the best fit is used.
export function ReadAloudSettings() {
  const { t } = useTranslation();
  const voices = useSystemVoices();
  const { chosenVoices, rate, setRate, setVoice } = useSpeechPreference();

  if (!voices) return null;
  if (voices.length === 0) {
    return (
      <Field data-testid="read-aloud-no-voices">
        <FieldTitle>{t("readAloud.settingsTitle")}</FieldTitle>
        <FieldDescription>{t("readAloud.noVoices")}</FieldDescription>
      </Field>
    );
  }

  const row = (language: SpeechLanguage) => (
    <VoiceRow
      chosen={chosenVoices[language]}
      key={language}
      language={language}
      onChange={(voiceURI) => setVoice(language, voiceURI)}
      rate={rate}
      voices={voices}
    />
  );
  const others = SPEECH_LANGUAGES.filter((language) => !MAIN_LANGUAGES.includes(language) && voicesFor(voices, language).length > 0);

  return (
    <div className="flex flex-col gap-4" data-testid="read-aloud-settings">
      <FieldContent>
        <FieldTitle>{t("readAloud.settingsTitle")}</FieldTitle>
        <FieldDescription>{t("readAloud.settingsDescription")}</FieldDescription>
      </FieldContent>
      {MAIN_LANGUAGES.map(row)}
      {others.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger>{t("readAloud.moreLanguages")}</CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-4 pt-2">{others.map(row)}</div>
          </CollapsibleContent>
        </Collapsible>
      )}
      <Field className="gap-8 has-[>[data-slot=field-content]]:items-center" orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="settings-speech-rate">{t("readAloud.speed")}</FieldLabel>
        </FieldContent>
        <Select onValueChange={(value) => value !== null && setRate(Number(value))} value={String(rate)}>
          <SelectTrigger className="w-40 shrink-0" data-testid="settings-speech-rate" id="settings-speech-rate">
            <SelectValue>{(value: string) => t(`readAloud.speeds.${value.replace(".", "_")}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SPEECH_RATES.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {t(`readAloud.speeds.${String(option).replace(".", "_")}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function VoiceRow({
  chosen,
  language,
  onChange,
  rate,
  voices,
}: {
  chosen: string | undefined;
  language: SpeechLanguage;
  onChange: (voiceURI: string) => void;
  rate: number;
  voices: SpeechVoice[];
}) {
  const { t } = useTranslation();
  const fitting = voicesFor(voices, language);
  const current = pickVoice(voices, language, chosen);
  const id = `settings-voice-${language}`;
  const voiceLabel = (voice: SpeechVoice) => `${voice.name.replace(/\s*\(.*\)$/, "")} (${voice.lang})`;

  return (
    <Field className="gap-4 has-[>[data-slot=field-content]]:items-center" orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{t(`readAloud.voiceFor.${language}`)}</FieldLabel>
        {!current && <FieldDescription>{t("readAloud.noVoiceForLanguage")}</FieldDescription>}
      </FieldContent>
      {current && (
        <div className="flex shrink-0 items-center gap-2">
          <Select onValueChange={(value) => value !== null && onChange(value)} value={current.voiceURI}>
            <SelectTrigger className="w-56" data-testid={id} id={id}>
              <SelectValue>{() => voiceLabel(current)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {fitting.map((voice) => (
                <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                  {voiceLabel(voice)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            aria-label={t("readAloud.test")}
            data-testid={`${id}-test`}
            onClick={() => speak(SPEECH_SAMPLES[language], { rate, voice: current })}
            shape="circle"
            size="icon-sm"
            title={t("readAloud.test")}
            variant="secondary"
          >
            <Play aria-hidden="true" />
          </Button>
        </div>
      )}
    </Field>
  );
}
