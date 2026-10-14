import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { GradeToneDot } from "@/components/ui/grade-score";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GRADE_BAND_COLORS,
  type GradeBand,
  type GradeBandColor,
  isGradeBands,
  joinGradeBands,
  MAX_GRADE_BANDS,
  sortGradeBands,
  splitGradeBands,
} from "@/lib/grade-bands";

type BandRow = { color: GradeBandColor; id: string; min: string };

let nextRowId = 0;
const toRows = (bands: GradeBand[]): BandRow[] =>
  bands.map((band) => ({ color: band.color, id: `band-${nextRowId++}`, min: String(band.min) }));

function toBands(rows: BandRow[]): GradeBand[] {
  return rows.map((row) => ({ color: row.color, min: Number(row.min.trim() === "" ? Number.NaN : row.min) }));
}

// The rows from 1% up: whole, distinct, 1–100.
function areValidRows(bands: GradeBand[]): boolean {
  return isGradeBands(bands) && bands.every((band) => band.min > 0);
}

// A graded test's grade bands (SLJ-135): a row per band, from its minimum
// percentage up, in a colour, and the colour below the lowest of them (grey
// unless the teacher picks another). In the course settings (the course's
// bands) and a graded test's (its own). Hands out the bands only while
// they're valid, highest first; until then it says what's wrong. Rows are put
// in order when a field is left.
export function GradeBandsEditor({
  idPrefix,
  onChange,
  value,
}: {
  idPrefix: string;
  onChange: (bands: GradeBand[]) => void;
  value: GradeBand[];
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<BandRow[]>(() => toRows(splitGradeBands(value).bands));
  const [belowColor, setBelowColor] = useState<GradeBandColor>(() => splitGradeBands(value).belowColor);
  const bands = toBands(rows);
  const isValid = areValidRows(bands);
  const lowestMin = isValid ? sortGradeBands(bands).at(-1)?.min : undefined;

  function update(nextRows: BandRow[], nextBelowColor = belowColor) {
    setRows(nextRows);
    setBelowColor(nextBelowColor);
    const nextBands = toBands(nextRows);
    if (areValidRows(nextBands)) onChange(joinGradeBands(nextBands, nextBelowColor));
  }

  function addBand() {
    const mins = toBands(rows).map((band) => band.min).filter(Number.isFinite);
    const min = mins.length > 0 ? Math.max(1, Math.min(...mins) - 10) : 50;
    update([...rows, { color: "blue", id: `band-${nextRowId++}`, min: String(min) }]);
  }

  return (
    <div className="flex flex-col gap-2" data-testid={`${idPrefix}-grade-bands`}>
      {/* One grid, so every colour picker (the one below the lowest band
          too) sits in the same column: percentage, "% and up", colour, remove. */}
      <div className="grid w-fit grid-cols-[auto_auto_auto_auto] items-center gap-2">
      {rows.map((row, index) => (
        <div className="contents" key={row.id}>
          <Input
            aria-invalid={!isValid}
            aria-label={t("gradeBands.minLabel", { index: index + 1 })}
            className="w-20"
            id={`${idPrefix}-band-${index}-min`}
            inputMode="numeric"
            max={100}
            min={1}
            onBlur={() => isValid && setRows((current) => [...current].sort((a, b) => Number(b.min) - Number(a.min)))}
            onChange={(event) =>
              update(rows.map((candidate) => (candidate.id === row.id ? { ...candidate, min: event.target.value } : candidate)))
            }
            type="number"
            value={row.min}
          />
          <span className="text-sm text-muted-foreground">{t("gradeBands.andUp")}</span>
          <GradeColorSelect
            label={t("gradeBands.colorLabel", { index: index + 1 })}
            onChange={(color) =>
              update(rows.map((candidate) => (candidate.id === row.id ? { ...candidate, color } : candidate)))
            }
            value={row.color}
          />
          <Button
            aria-label={t("gradeBands.removeBand", { index: index + 1 })}
            disabled={rows.length === 1}
            onClick={() => update(rows.filter((candidate) => candidate.id !== row.id))}
            size="icon-sm"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ))}
      {lowestMin !== undefined && (
        <div className="contents" data-testid={`${idPrefix}-below-band`}>
          <span className="col-span-2 text-sm text-muted-foreground">{t("gradeBands.below", { min: lowestMin })}</span>
          <GradeColorSelect
            label={t("gradeBands.belowColorLabel", { min: lowestMin })}
            onChange={(color) => update(rows, color)}
            value={belowColor}
          />
        </div>
      )}
      </div>
      {!isValid && <FieldError>{t("gradeBands.invalid")}</FieldError>}
      <div>
        <Button
          // One place is kept for the colour below the lowest band.
          disabled={rows.length >= MAX_GRADE_BANDS - 1}
          onClick={addBand}
          size="sm"
          variant="secondary"
        >
          <Plus aria-hidden="true" />
          {t("gradeBands.addBand")}
        </Button>
      </div>
    </div>
  );
}

function GradeColorSelect({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (color: GradeBandColor) => void;
  value: GradeBandColor;
}) {
  const { t } = useTranslation();

  return (
    <Select onValueChange={(color) => onChange(color as GradeBandColor)} value={value}>
      <SelectTrigger aria-label={label} className="w-36">
        <SelectValue>
          <GradeToneDot tone={value} />
          {t(`gradeBands.colors.${value}`)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {GRADE_BAND_COLORS.map((color) => (
          <SelectItem key={color} value={color}>
            <GradeToneDot tone={color} />
            {t(`gradeBands.colors.${color}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// The bands in one line each, for a test that follows the course's.
export function GradeBandsSummary({ bands }: { bands: GradeBand[] }) {
  const { t } = useTranslation();
  const { bands: above, belowColor } = splitGradeBands(bands);
  const lowest = above.at(-1);

  return (
    <ul className="flex flex-col gap-1" data-testid="grade-bands-summary">
      {above.map((band) => (
        <li key={band.min}>
          <FieldDescription className="flex items-center gap-2">
            <GradeToneDot tone={band.color} />
            {t("gradeBands.summaryBand", { color: t(`gradeBands.colors.${band.color}`), min: band.min })}
          </FieldDescription>
        </li>
      ))}
      {lowest && (
        <li>
          <FieldDescription className="flex items-center gap-2">
            <GradeToneDot tone={belowColor} />
            {t("gradeBands.belowSummary", { color: t(`gradeBands.colors.${belowColor}`), min: lowest.min })}
          </FieldDescription>
        </li>
      )}
    </ul>
  );
}
