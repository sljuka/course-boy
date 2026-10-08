import { Palette, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  PROGRAM_THEME_COLORS,
  REQUIRED_PROGRAM_THEME_COLORS,
  type ProgramTheme,
  type ProgramThemeColor,
} from "@/lib/program-package";
import { resolveProgramTheme } from "@/lib/program-theme";
import { useProgramThemePreview } from "@/lib/program-theme-preview";

// A theme to start from: warm paper, dark ink, violet.
const STARTER_THEME: ProgramTheme = { background: "#fbf7ef", foreground: "#1c1917", primary: "#7c3aed" };

// Shown up front: the three required core colors, then the two most visible
// optional ones. The rest are under "More colors".
const MAIN_COLORS: readonly ProgramThemeColor[] = [...REQUIRED_PROGRAM_THEME_COLORS, "secondary", "sidebar"];

const MORE_COLORS = PROGRAM_THEME_COLORS.filter((name) => !MAIN_COLORS.includes(name));

const isRequired = (name: ProgramThemeColor) => (REQUIRED_PROGRAM_THEME_COLORS as readonly string[]).includes(name);

// The program's theme (SLJ-32): the three core colors and the secondary and
// sidebar colors up front, and "More colors" for the app's other color
// variables (each shows the color it gets now, derived until the teacher sets
// it). Pairs that don't read quietly fall back to readable ones
// (resolveProgramTheme). While the editor is open the whole app shows the
// theme, unsaved changes included.
export function ProgramThemeEditor({
  onChange,
  theme,
}: {
  onChange: (theme: ProgramTheme | null) => void;
  theme: ProgramTheme | null;
}) {
  const { t } = useTranslation();
  useProgramThemePreview(theme);

  if (!theme) {
    return (
      <FieldSet>
        <FieldLegend>{t("programs.theme")}</FieldLegend>
        <FieldDescription>{t("programs.themeHint")}</FieldDescription>
        <div>
          <Button data-testid="program-add-theme" onClick={() => onChange(STARTER_THEME)} size="sm" variant="secondary">
            <Palette aria-hidden="true" />
            {t("programs.addTheme")}
          </Button>
        </div>
      </FieldSet>
    );
  }

  const resolved = resolveProgramTheme(theme);
  const current = (name: ProgramThemeColor) => theme[name] ?? resolved?.variables[`--${name}`] ?? "#000000";
  const setColor = (name: ProgramThemeColor, color: string) => onChange({ ...theme, [name]: color });
  const clearColor = (name: ProgramThemeColor) => {
    const next = { ...theme };
    delete next[name];
    onChange(next);
  };
  const colorLabel = (name: ProgramThemeColor) => t(`programs.themeColor.${name}`);

  return (
    <FieldSet>
      <FieldLegend>{t("programs.theme")}</FieldLegend>
      <FieldDescription>{t("programs.themeHint")}</FieldDescription>
      <div className="flex flex-wrap items-end gap-4">
        {MAIN_COLORS.map((name) => (
          <ThemeColorField
            key={name}
            label={colorLabel(name)}
            name={name}
            onChange={setColor}
            onClear={!isRequired(name) && name in theme ? () => clearColor(name) : undefined}
            value={current(name)}
          />
        ))}
        <Button onClick={() => onChange(null)} size="sm" variant="ghost">
          {t("programs.removeTheme")}
        </Button>
      </div>
      <Collapsible>
        <CollapsibleTrigger data-testid="program-theme-more">{t("programs.moreColors")}</CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MORE_COLORS.map((name) => (
              <ThemeColorField
                key={name}
                label={colorLabel(name)}
                name={name}
                onChange={setColor}
                onClear={name in theme ? () => clearColor(name) : undefined}
                value={current(name)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </FieldSet>
  );
}

function ThemeColorField({
  label,
  name,
  onChange,
  onClear,
  value,
}: {
  label: string;
  name: ProgramThemeColor;
  onChange: (name: ProgramThemeColor, color: string) => void;
  onClear?: () => void;
  value: string;
}) {
  const { t } = useTranslation();
  return (
    <Field className="w-44">
      <FieldLabel htmlFor={`program-color-${name}`}>{label}</FieldLabel>
      <div className="flex items-center gap-1">
        <Input
          className="h-9 p-1"
          data-testid={`program-color-${name}`}
          id={`program-color-${name}`}
          onChange={(event) => onChange(name, event.target.value)}
          type="color"
          value={value}
        />
        {onClear && (
          <Button aria-label={t("programs.useDerivedColor")} onClick={onClear} size="icon-xs" variant="ghost">
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
    </Field>
  );
}
