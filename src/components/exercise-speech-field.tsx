import { useTranslation } from "react-i18next";

import type { TestExercise } from "@/components/test-editor-prototype-types";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SPEECH_LANGUAGES, type SpeechLanguage } from "@/lib/exercise-speech";

const OFF = "off";

// Read aloud (SLJ-174) in an exercise's "more options": off, or the language
// its text is in, so the student's voice for that language reads it. The
// voice itself is the student's (Settings → Sound).
export function ExerciseSpeechField({
  exercise,
  onChange,
}: {
  exercise: TestExercise;
  onChange: (updater: (exercise: TestExercise) => TestExercise) => void;
}) {
  const { t } = useTranslation();
  const id = `exercise-speech-${exercise.id}`;
  const label = (value: string) => (value === OFF ? t("readAloud.off") : t(`readAloud.languages.${value}`));

  return (
    <Field className="gap-8 has-[>[data-slot=field-content]]:items-center" orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{t("readAloud.field")}</FieldLabel>
        <FieldDescription>{t("readAloud.fieldDescription")}</FieldDescription>
      </FieldContent>
      <Select
        onValueChange={(value) => {
          if (value === null) return;
          onChange((current) => {
            const { speech: _previous, ...rest } = current;
            return (value === OFF ? rest : { ...rest, speech: { lang: value as SpeechLanguage } }) as TestExercise;
          });
        }}
        value={exercise.speech?.lang ?? OFF}
      >
        <SelectTrigger className="w-40 shrink-0" data-testid="exercise-speech" id={id}>
          <SelectValue>{(value: string) => label(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {[OFF, ...SPEECH_LANGUAGES].map((value) => (
            <SelectItem key={value} value={value}>
              {label(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
