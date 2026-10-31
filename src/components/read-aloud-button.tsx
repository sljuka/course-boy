import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { SpeechLanguage } from "@/lib/exercise-speech";
import { useReadAloud } from "@/lib/speech-preference";

// 🔊 that reads `text` (Markdown) aloud in `language` with the student's voice
// (SLJ-174). Nothing when the exercise isn't read aloud or this device has no
// voice for the language; never on paper.
export function ReadAloudButton({ language, text }: { language: SpeechLanguage | undefined; text: string }) {
  const { t } = useTranslation();
  const read = useReadAloud(language);
  if (!read || !text.trim()) return null;

  return (
    <Button
      aria-label={t("readAloud.button")}
      className="shrink-0 print:hidden"
      data-testid="read-aloud"
      onClick={(event) => {
        // Inside an option's label: reading it doesn't pick it.
        event.preventDefault();
        event.stopPropagation();
        read(text);
      }}
      shape="circle"
      size="icon-sm"
      title={t("readAloud.button")}
      type="button"
      variant="ghost"
    >
      <Volume2 aria-hidden="true" />
    </Button>
  );
}
