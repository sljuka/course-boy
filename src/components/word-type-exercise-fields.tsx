import { useMemo } from "react";
import { Check, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import { ColorPickerField } from "@/components/color-picker-field";
import { ColorSwatch } from "@/components/ui/color-swatch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WordTypeTokens } from "@/components/word-type-tokens";
import type { WordTypeTestExercise } from "@/components/test-editor-prototype-types";
import {
  addWordType,
  removeWordType,
  updateColor,
  updateIcon,
  updateName,
  updatePrompt,
  updateSymbol,
  updateText,
  validate,
} from "@/components/exercise-kinds/word-types-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import { MAX_WORD_TYPE_ICON_LENGTH } from "@/lib/exercise-kinds/word-types";
import { extractMarkedWordTypeIds, parseWordTypeMarkup } from "@/lib/word-type-markup";

function WordTypeColorField({
  onChange,
  value,
}: {
  onChange: (color: string) => void;
  value: string;
}) {
  return (
    <ColorPickerField
      onChange={onChange}
      trigger={<Button aria-label="Choose color" className="h-8 w-8" size="icon" variant="ghost" />}
      value={value}
    >
      <ColorSwatch className="size-5" color={value} />
    </ColorPickerField>
  );
}

const ICON_PLACEHOLDER_OPTIONS = [
  "🏀",
  "😊",
  "😎",
  "🙂",
  "🤖",
  "👦",
  "👧",
  "👷",
  "🏃",
  "💃🏻",
  "🌸",
  "🍉",
  "🍎",
  "🏥",
  "🏢",
  "🏠",
  "⚽",
  "🎲",
];

// Deterministic per-row (not re-randomized on every keystroke elsewhere in
// the form), but varied across rows since each word type's id is its own
// random string — purely a hint of what an icon could look like.
function pickIconPlaceholder(seed: string) {
  const hash = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return ICON_PLACEHOLDER_OPTIONS[hash % ICON_PLACEHOLDER_OPTIONS.length];
}

function WordTypeIconField({
  onChange,
  placeholder,
  value,
}: {
  onChange: (icon: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button aria-label="Choose icon (optional)" className="h-8 w-16" variant="outline" />}
      >
        <span className={value ? undefined : "opacity-40"}>{value || placeholder}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onChange("")}>
          <span>No icon</span>
          {!value && <Check aria-hidden="true" className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {ICON_PLACEHOLDER_OPTIONS.map((icon) => (
          <DropdownMenuItem key={icon} onClick={() => onChange(icon)}>
            <span>{icon}</span>
            {value === icon && <Check aria-hidden="true" className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-1.5 py-1">
          {/* stopPropagation: the menu's own keydown handling (arrow-key
              navigation, typeahead) otherwise swallows every keystroke
              before it reaches this field, even though it's genuinely
              focused. */}
          <Input
            aria-label="Custom icon"
            maxLength={MAX_WORD_TYPE_ICON_LENGTH}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Custom…"
            value={value}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getValidationLabel(status: "error" | "valid" | "warning") {
  switch (status) {
    case "error":
      return "Invalid";
    case "warning":
      return "Warning";
    case "valid":
      return "Valid";
  }
}

export function WordTypeExerciseFields({
  exercise,
  locale,
  onChange,
}: FieldsComponentProps<WordTypeTestExercise>) {
  const prompt = exercise.locales[locale]?.prompt ?? "";
  const text = exercise.locales[locale]?.text ?? "";
  const validation = validate(exercise, locale);

  const previewWordTypes = useMemo(
    () =>
      exercise.wordTypes.map((wordType) => ({
        color: wordType.color,
        icon: wordType.icon,
        id: wordType.id,
        name: wordType.names[locale] ?? "",
        symbol: wordType.symbol,
      })),
    [exercise.wordTypes, locale],
  );

  const previewTokens = useMemo(() => {
    const symbolToId = new Map(
      exercise.wordTypes
        .filter((wordType) => wordType.symbol.trim().length > 0)
        .map((wordType) => [wordType.symbol, wordType.id]),
    );

    return parseWordTypeMarkup(text, symbolToId);
  }, [exercise.wordTypes, text]);

  // One entry per *marked word*, not per token — matches the compact,
  // text-token-free representation `WordTypeTokens` indexes into (the same
  // shape the player's decodeWordTypeSelections produces), otherwise a text
  // token between two marked words shifts every selection after it out of
  // alignment with the word it's meant to color.
  const previewSelections = useMemo(
    () => extractMarkedWordTypeIds(previewTokens),
    [previewTokens],
  );

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`exercise-prompt-${exercise.id}-${locale}`}>
          Prompt
        </FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-prompt-${exercise.id}-${locale}`}
          onChange={(event) =>
            onChange((currentExercise) => updatePrompt(currentExercise, locale, event.target.value))
          }
          placeholder="Mark the nouns and verbs"
          rows={2}
          value={prompt}
        />
      </Field>

      <Field>
        <FieldLabel>Word types</FieldLabel>
        <div className="flex flex-col gap-2">
          {exercise.wordTypes.map((wordType) => (
            <div className="flex flex-wrap items-center gap-2" key={wordType.id}>
              <WordTypeColorField
                onChange={(color) =>
                  onChange((currentExercise) => updateColor(currentExercise, wordType.id, color))
                }
                value={wordType.color}
              />
              <Input
                aria-label="Name"
                className="min-w-32 flex-1"
                onChange={(event) =>
                  onChange((currentExercise) =>
                    updateName(currentExercise, wordType.id, locale, event.target.value),
                  )
                }
                placeholder="Noun"
                value={wordType.names[locale] ?? ""}
              />
              <Input
                aria-label="Symbol"
                className="w-14 text-center"
                maxLength={1}
                onChange={(event) =>
                  onChange((currentExercise) =>
                    updateSymbol(currentExercise, wordType.id, event.target.value),
                  )
                }
                placeholder="n"
                value={wordType.symbol}
              />
              <WordTypeIconField
                onChange={(icon) =>
                  onChange((currentExercise) => updateIcon(currentExercise, wordType.id, icon))
                }
                placeholder={pickIconPlaceholder(wordType.id)}
                value={wordType.icon}
              />
              <button
                aria-label="Remove word type"
                className="inline-flex items-center text-muted-foreground hover:text-foreground"
                onClick={() =>
                  onChange((currentExercise) => removeWordType(currentExercise, wordType.id))
                }
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          onClick={() =>
            onChange((currentExercise) => addWordType(currentExercise, [locale]))
          }
          size="sm"
          variant="ghost"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add type
        </Button>
      </Field>

      <Field>
        <FieldLabel htmlFor={`exercise-text-${exercise.id}-${locale}`}>Text</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-text-${exercise.id}-${locale}`}
          onChange={(event) =>
            onChange((currentExercise) => updateText(currentExercise, locale, event.target.value))
          }
          placeholder="Mike{{n}} is jumping{{v}} over the fence{{n}}."
          rows={3}
          value={text}
        />
        {validation.status !== "idle" && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={validation.status === "valid" ? "success" : "warning"}>
              {getValidationLabel(validation.status)}
            </Badge>
            <CardDescription>{validation.message}</CardDescription>
          </div>
        )}
        {previewTokens.length > 0 && (
          // overflow-visible: the preview's floating word-type icons are
          // deliberately positioned outside normal flow and must not be
          // clipped by the Card's default overflow-hidden — `WordTypeTokens`
          // itself reserves headroom for them when any word type has an icon.
          <Card className="overflow-visible p-3">
            <WordTypeTokens
              selections={previewSelections}
              tokens={previewTokens}
              wordTypes={previewWordTypes}
            />
          </Card>
        )}
      </Field>
    </>
  );
}
