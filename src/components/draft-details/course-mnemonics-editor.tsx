import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_MNEMONIC_SHOW_FIRST,
  findMnemonicProblems,
  MNEMONIC_MAX_LENGTH,
  MNEMONIC_SHOW_FIRST_MAX,
  type CourseMnemonic,
} from "@/lib/mnemonics";
import { countCharacters } from "@/lib/section-summary";

// One language's mnemonics on the course form (SLJ-37): term, mnemonic, how
// many places are marked, and other forms of the term. Rows are kept
// exactly as typed (aliases as one comma-separated text); the main process
// stores only valid rows, so a row being typed or with a problem shown here
// is never saved half-done.
export function CourseMnemonicsEditor({
  locale,
  mnemonics,
  onChange,
}: {
  locale: string;
  mnemonics: CourseMnemonic[];
  onChange: (mnemonics: CourseMnemonic[]) => void;
}) {
  const { t } = useTranslation();
  const problems = findMnemonicProblems(mnemonics);

  function updateRow(index: number, patch: Partial<CourseMnemonic>) {
    onChange(mnemonics.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  return (
    <Accordion>
      <AccordionItem value="mnemonics">
        <div className="flex items-center gap-1">
          <AccordionTrigger className="flex-none">
            {t("mnemonics.title")}
            {mnemonics.length > 0 && ` (${mnemonics.length})`}
          </AccordionTrigger>
          <InfoTooltip aria-label={t("mnemonics.help")}>{t("mnemonics.help")}</InfoTooltip>
        </div>
        <AccordionContent>
          <div className="flex flex-col gap-4" data-testid={`course-mnemonics-${locale}`}>
            {mnemonics.length === 0 && <CardDescription>{t("mnemonics.empty")}</CardDescription>}
            {mnemonics.map((row, index) => {
              const problem = problems[index];
              const mnemonicLength = countCharacters(row.mnemonic);

              return (
                <div className="flex flex-col gap-2" key={index}>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.5rem_auto] items-center gap-2">
                    <Input
                      aria-invalid={problem === "emptyTerm" || problem === "duplicateTerm" || problem === "termTooLong"}
                      aria-label={t("mnemonics.term")}
                      onChange={(event) => updateRow(index, { term: event.target.value })}
                      placeholder={t("mnemonics.termPlaceholder")}
                      value={row.term}
                    />
                    <Input
                      aria-invalid={problem === "emptyMnemonic" || problem === "mnemonicTooLong"}
                      aria-label={t("mnemonics.mnemonic")}
                      onChange={(event) => updateRow(index, { mnemonic: event.target.value })}
                      placeholder={t("mnemonics.mnemonicPlaceholder")}
                      title={t("mnemonics.length", { count: mnemonicLength, max: MNEMONIC_MAX_LENGTH })}
                      value={row.mnemonic}
                    />
                    <Input
                      aria-label={t("mnemonics.showFirst")}
                      max={MNEMONIC_SHOW_FIRST_MAX}
                      min={1}
                      onChange={(event) => {
                        const value = Number.parseInt(event.target.value, 10);
                        updateRow(index, { showFirst: Number.isNaN(value) ? undefined : value });
                      }}
                      placeholder={String(DEFAULT_MNEMONIC_SHOW_FIRST)}
                      title={t("mnemonics.showFirst")}
                      type="number"
                      value={row.showFirst ?? ""}
                    />
                    <Button
                      aria-label={t("mnemonics.remove")}
                      onClick={() => onChange(mnemonics.filter((_row, rowIndex) => rowIndex !== index))}
                      size="icon-sm"
                      title={t("mnemonics.remove")}
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  <Input
                    aria-label={t("mnemonics.aliases")}
                    onChange={(event) => updateRow(index, { aliases: event.target.value.split(",") })}
                    placeholder={t("mnemonics.aliasesPlaceholder")}
                    value={(row.aliases ?? []).join(",")}
                  />
                  {problem && (
                    <FieldError>{t(`mnemonics.problems.${problem}`, { max: MNEMONIC_MAX_LENGTH })}</FieldError>
                  )}
                </div>
              );
            })}
            <div>
              <Button
                onClick={() => onChange([...mnemonics, { mnemonic: "", term: "" }])}
                size="sm"
                variant="secondary"
              >
                <Plus aria-hidden="true" />
                {t("mnemonics.add")}
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
