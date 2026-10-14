import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { TestExercise } from "@/components/test-editor-prototype-types";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_EXERCISE_POINTS,
  isExercisePoints,
  MAX_EXERCISE_POINTS,
  MIN_EXERCISE_POINTS,
} from "@/lib/grade-bands";

// An exercise's points in a graded test (SLJ-135), under its "Show more
// options". Kept as typed while it isn't a whole number from 1 to 100 (the
// exercise keeps its last valid points meanwhile); the default isn't stored.
export function ExercisePointsField({
  exercise,
  onChange,
}: {
  exercise: TestExercise;
  onChange: (updater: (exercise: TestExercise) => TestExercise) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(String(exercise.points ?? DEFAULT_EXERCISE_POINTS));
  const isValid = isExercisePoints(Number(text)) && text.trim() !== "";
  const id = `exercise-points-${exercise.id}`;

  function update(nextText: string) {
    setText(nextText);
    const points = Number(nextText);
    if (nextText.trim() === "" || !isExercisePoints(points)) return;
    onChange(({ points: _points, ...rest }) =>
      (points === DEFAULT_EXERCISE_POINTS ? rest : { ...rest, points }) as TestExercise,
    );
  }

  return (
    <Field>
      <div className="flex items-center gap-1">
        <FieldLabel htmlFor={id}>{t("testEditor.points")}</FieldLabel>
        <InfoTooltip aria-label={t("testEditor.pointsHelp")}>{t("testEditor.pointsHelp")}</InfoTooltip>
      </div>
      <Input
        aria-invalid={!isValid}
        className="w-24"
        data-testid="exercise-points"
        id={id}
        inputMode="numeric"
        max={MAX_EXERCISE_POINTS}
        min={MIN_EXERCISE_POINTS}
        onChange={(event) => update(event.target.value)}
        type="number"
        value={text}
      />
      {!isValid && <FieldError>{t("testEditor.pointsInvalid")}</FieldError>}
    </Field>
  );
}
