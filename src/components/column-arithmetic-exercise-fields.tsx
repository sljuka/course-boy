import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  addOperand,
  MAX_COLUMN_OPERAND,
  maxOperands,
  MIN_COLUMN_OPERANDS,
  removeOperand,
  setOperation,
  updateLocale,
  updateOperand,
  validate,
} from "@/components/exercise-kinds/column-arithmetic-logic";
import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import type { ColumnArithmeticTestExercise, NumericSolutionSpace } from "@/components/test-editor-prototype-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ColumnArithmeticOperation, ColumnArithmeticRegrouping } from "@/lib/course-package";

const OPERATIONS: ColumnArithmeticOperation[] = ["add", "subtract"];
const REGROUPINGS: ColumnArithmeticRegrouping[] = ["any", "required", "none"];
const SPACES: NumericSolutionSpace[] = ["sm", "md", "lg", "xl"];

// An empty box is no number yet (the check asks for one), not 0.
const parseBound = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
const showBound = (value: number) => (Number.isFinite(value) ? String(value) : "");

// The teacher's side of written addition and subtraction (SLJ-231): the
// instruction, the operation, each number's range, and the rules the drawn
// numbers follow. A sample problem shows what a student could get.
export function ColumnArithmeticExerciseFields({
  exercise,
  locale,
  moreOptions,
  onChange,
}: FieldsComponentProps<ColumnArithmeticTestExercise>) {
  const { t } = useTranslation();
  const content = exercise.locales[locale] ?? { hint: "", prompt: "" };
  const validation = validate(exercise, locale);
  const fieldId = (name: string) => `column-arithmetic-${name}-${exercise.id}-${locale}`;

  return (
    <>
      <Field>
        <FieldLabel htmlFor={fieldId("prompt")}>{t("columnArithmetic.promptLabel")}</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={fieldId("prompt")}
          onChange={(event) => onChange((current) => updateLocale(current, locale, { prompt: event.target.value }))}
          placeholder={t("columnArithmetic.promptPlaceholder")}
          rows={2}
          value={content.prompt}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={fieldId("operation")}>{t("columnArithmetic.operationLabel")}</FieldLabel>
        <Select
          onValueChange={(value) => onChange((current) => setOperation(current, value as ColumnArithmeticOperation))}
          value={exercise.operation}
        >
          <SelectTrigger className="w-full sm:w-64" id={fieldId("operation")}>
            <SelectValue>{(value: ColumnArithmeticOperation) => t(`columnArithmetic.operation.${value}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {OPERATIONS.map((operation) => (
              <SelectItem key={operation} value={operation}>
                {t(`columnArithmetic.operation.${operation}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>{t("columnArithmetic.numbersLabel")}</FieldLabel>
        <FieldDescription>{t("columnArithmetic.numbersHelp")}</FieldDescription>
        <div className="flex flex-col gap-2">
          {exercise.operands.map((range, index) => {
            const name = t("columnArithmetic.numberLabel", { number: index + 1 });
            return (
              <div className="flex flex-wrap items-center gap-2" data-testid="column-arithmetic-number" key={range.id}>
                <span className="w-20 text-sm">{name}</span>
                <span className="text-sm">{t("columnArithmetic.min")}</span>
                <Input
                  aria-label={`${name}, ${t("columnArithmetic.min")}`}
                  className="w-36"
                  max={MAX_COLUMN_OPERAND}
                  min={0}
                  onChange={(event) => onChange((current) => updateOperand(current, index, { min: parseBound(event.target.value) }))}
                  type="number"
                  value={showBound(range.min)}
                />
                <span className="text-sm">{t("columnArithmetic.max")}</span>
                <Input
                  aria-label={`${name}, ${t("columnArithmetic.max")}`}
                  className="w-36"
                  max={MAX_COLUMN_OPERAND}
                  min={0}
                  onChange={(event) => onChange((current) => updateOperand(current, index, { max: parseBound(event.target.value) }))}
                  type="number"
                  value={showBound(range.max)}
                />
                {exercise.operands.length > MIN_COLUMN_OPERANDS && (
                  <Button
                    aria-label={t("columnArithmetic.removeNumber", { number: index + 1 })}
                    onClick={() => onChange((current) => removeOperand(current, index))}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {exercise.operands.length < maxOperands(exercise) && (
          <div>
            <Button onClick={() => onChange(addOperand)} size="sm" type="button" variant="secondary">
              <Plus aria-hidden="true" />
              {t("columnArithmetic.addNumber")}
            </Button>
          </div>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor={fieldId("regrouping")}>{t("columnArithmetic.regroupingLabel")}</FieldLabel>
        <Select
          onValueChange={(value) => onChange((current) => ({ ...current, regrouping: value as ColumnArithmeticRegrouping }))}
          value={exercise.regrouping}
        >
          <SelectTrigger className="w-full sm:w-64" id={fieldId("regrouping")}>
            <SelectValue>{(value: ColumnArithmeticRegrouping) => t(`columnArithmetic.regrouping.${value}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {REGROUPINGS.map((regrouping) => (
              <SelectItem key={regrouping} value={regrouping}>
                {t(`columnArithmetic.regrouping.${regrouping}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Label>
        <Checkbox
          checked={exercise.gradeCarries}
          onCheckedChange={(checked) => onChange((current) => ({ ...current, gradeCarries: checked }))}
        />
        {t("columnArithmetic.gradeCarries")}
      </Label>

      <Field>
        <FieldLabel htmlFor={fieldId("space")}>{t("columnArithmetic.spaceLabel")}</FieldLabel>
        <Select
          onValueChange={(value) => onChange((current) => ({ ...current, solutionSpace: value as NumericSolutionSpace }))}
          value={exercise.solutionSpace}
        >
          <SelectTrigger className="w-full sm:w-64" id={fieldId("space")}>
            <SelectValue>{(value: NumericSolutionSpace) => t(`columnArithmetic.space.${value}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SPACES.map((space) => (
              <SelectItem key={space} value={space}>
                {t(`columnArithmetic.space.${space}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>{t("columnArithmetic.spaceHelp")}</FieldDescription>
      </Field>

      {validation.status !== "idle" && (
        <div className="flex flex-wrap items-center gap-2" data-testid="column-arithmetic-check">
          <Badge variant={validation.status === "valid" ? "success" : "warning"}>
            {validation.status === "valid" ? t("columnArithmetic.valid") : t("columnArithmetic.invalid")}
          </Badge>
          <CardDescription>{validation.message}</CardDescription>
        </div>
      )}

      <ExerciseMoreOptions defaultOpen={Boolean(content.hint) || hasMoreOptionsSet(exercise)}>
        <Field>
          <FieldLabel htmlFor={fieldId("hint")}>{t("columnArithmetic.hintLabel")}</FieldLabel>
          <Textarea
            className="min-h-0 resize-none overflow-hidden"
            id={fieldId("hint")}
            onChange={(event) => onChange((current) => updateLocale(current, locale, { hint: event.target.value }))}
            placeholder={t("columnArithmetic.hintPlaceholder")}
            rows={2}
            value={content.hint}
          />
        </Field>
        {moreOptions}
      </ExerciseMoreOptions>
    </>
  );
}
