import { useTranslation } from "react-i18next";

import { Field, FieldContent, FieldDescription, FieldLabel, FieldSet, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// A test's type (SLJ-135): a practice test (feedback after each answer) or a
// graded one (a score at the end). Its grade bands are under "Show more
// options" (`TestMoreOptions`).
export function TestTypeField({
  graded,
  onGradedChange,
}: {
  graded: boolean;
  onGradedChange: (graded: boolean) => void;
}) {
  const { t } = useTranslation();
  const types = [
    { description: t("testEditor.practiceDescription"), label: t("testEditor.practice"), value: "practice" },
    { description: t("testEditor.gradedDescription"), label: t("testEditor.graded"), value: "graded" },
  ];

  return (
    <FieldSet aria-label={t("testEditor.testType")}>
      <FieldTitle>{t("testEditor.testType")}</FieldTitle>
      <RadioGroup onValueChange={(value) => onGradedChange(value === "graded")} value={graded ? "graded" : "practice"}>
        {types.map((type) => (
          <FieldLabel htmlFor={`test-type-${type.value}`} key={type.value}>
            <Field orientation="horizontal">
              <RadioGroupItem data-testid={`test-type-${type.value}`} id={`test-type-${type.value}`} value={type.value} />
              <FieldContent>
                <FieldTitle>{type.label}</FieldTitle>
                <FieldDescription>{type.description}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}
