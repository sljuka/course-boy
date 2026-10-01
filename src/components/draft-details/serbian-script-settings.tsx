import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SerbianLocale, SerbianScriptSetting } from "@/lib/serbian-script";

type Choice = SerbianLocale | "separately";

const choices: Array<{ description: string; label: string; value: Choice }> = [
  { description: "serbianScript.sourceLatinDescription", label: "serbianScript.sourceLatin", value: "sr" },
  {
    description: "serbianScript.sourceCyrillicDescription",
    label: "serbianScript.sourceCyrillic",
    value: "sr-Cyrl",
  },
  { description: "serbianScript.separatelyDescription", label: "serbianScript.separately", value: "separately" },
];

// The course settings' "Serbian scripts" choice (SLJ-17): write in Latin or
// Cyrillic and generate the other, or write both by hand. Choosing a source
// regenerates the other script across the whole course, so it asks first
// whenever there's text in that script that would be replaced. Collapsible
// like the course's other settings, but open by default.
export function SerbianScriptSettings({
  hasGeneratedLocaleText,
  onChange,
  value,
}: {
  // Whether the course already has the script a source choice would generate.
  hasGeneratedLocaleText: (source: SerbianLocale) => boolean;
  onChange: (next: SerbianScriptSetting | null) => void;
  value: SerbianScriptSetting | null;
}) {
  const { t } = useTranslation();
  const [pendingSource, setPendingSource] = useState<SerbianLocale | null>(null);
  const [keepAsIsText, setKeepAsIsText] = useState((value?.keepAsIs ?? []).join(", "));

  function choose(choice: Choice) {
    if (choice === "separately") {
      onChange(null);
      return;
    }

    if (choice === value?.source) {
      return;
    }

    if (hasGeneratedLocaleText(choice)) {
      setPendingSource(choice);
      return;
    }

    onChange({ ...value, source: choice });
  }

  function updateKeepAsIs(text: string) {
    setKeepAsIsText(text);

    if (value) {
      const keepAsIs = text
        .split(",")
        .map((word) => word.trim())
        .filter(Boolean);

      onChange({ source: value.source, ...(keepAsIs.length > 0 ? { keepAsIs } : {}) });
    }
  }

  const fromLatin = pendingSource === "sr";

  return (
    <Accordion defaultValue={["serbian-scripts"]}>
      <AccordionItem value="serbian-scripts">
        <AccordionTrigger className="flex-none">{t("serbianScript.title")}</AccordionTrigger>
        <AccordionContent>
          {/* No FieldLegend: the accordion header is the visible title, and a
              hidden legend would pull the description up under the header. */}
          <FieldSet aria-label={t("serbianScript.title")}>
            <FieldDescription>{t("serbianScript.description")}</FieldDescription>
            <RadioGroup onValueChange={(next) => choose(next as Choice)} value={value?.source ?? "separately"}>
              {choices.map((choice) => (
                <FieldLabel htmlFor={`serbian-script-${choice.value}`} key={choice.value}>
                  <Field orientation="horizontal">
                    <RadioGroupItem id={`serbian-script-${choice.value}`} value={choice.value} />
                    <FieldContent>
                      <FieldTitle>{t(choice.label)}</FieldTitle>
                      <FieldDescription>{t(choice.description)}</FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
            {value && (
              <Field>
                <FieldLabel htmlFor="serbian-script-keep-as-is">{t("serbianScript.keepAsIsLabel")}</FieldLabel>
                <Input
                  id="serbian-script-keep-as-is"
                  onChange={(event) => updateKeepAsIs(event.target.value)}
                  placeholder={t("serbianScript.keepAsIsPlaceholder")}
                  value={keepAsIsText}
                />
                <FieldDescription>{t("serbianScript.keepAsIsDescription")}</FieldDescription>
              </Field>
            )}
            <Dialog onOpenChange={(open) => !open && setPendingSource(null)} open={pendingSource !== null}>
              <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
                <DialogHeader>
                  <DialogTitle>
                    {fromLatin ? t("serbianScript.confirmLatinTitle") : t("serbianScript.confirmCyrillicTitle")}
                  </DialogTitle>
                  <DialogDescription>
                    {fromLatin
                      ? t("serbianScript.confirmLatinDescription")
                      : t("serbianScript.confirmCyrillicDescription")}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button onClick={() => setPendingSource(null)} variant="secondary">
                    {t("serbianScript.cancel")}
                  </Button>
                  <Button
                    onClick={() => {
                      if (pendingSource) {
                        onChange({ ...value, source: pendingSource });
                      }

                      setPendingSource(null);
                    }}
                    variant="destructive"
                  >
                    {fromLatin ? t("serbianScript.confirmLatinButton") : t("serbianScript.confirmCyrillicButton")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </FieldSet>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
