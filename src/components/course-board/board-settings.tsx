import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBoardSettingsQuery, useSetBoardSettingsMutation } from "@/lib/board-queries";
import { DEFAULT_TEACHER_LIMIT_BYTES, MAX_BOARD_NAME_LENGTH } from "@/lib/course-board";
import { formatFileSize } from "@/lib/format-file-size";
import { useAppState } from "@/lib/use-app-state";

const MB = 1024 * 1024;
// What this computer keeps of each board of the teacher's own courses.
const OWN_LIMITS = [10 * MB, 30 * MB, DEFAULT_TEACHER_LIMIT_BYTES, 300 * MB, 1000 * MB];

const segmenter = new Intl.Segmenter();

// Settings → Course boards (SLJ-149), one component per setting, so the
// section draws its usual row and line around each: the board name others see
// (never the profile name), boards on this computer at all, and, for a
// teacher, how much of each of their own courses' boards it keeps.

export function BoardNameSetting() {
  const { t } = useTranslation();
  const { data: settings } = useBoardSettingsQuery();
  const setSettings = useSetBoardSettingsMutation();
  const [name, setName] = useState("");
  useEffect(() => {
    if (settings) setName(settings.name);
  }, [settings]);
  if (!settings) return null;

  const isTooLong = [...segmenter.segment(name.trim())].length > MAX_BOARD_NAME_LENGTH;

  function saveName(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isTooLong || name.trim() === settings?.name) return;
    setSettings.mutate({ name: name.trim() });
  }

  return (
    <form onSubmit={saveName}>
      <Field className="gap-8 has-[>[data-slot=field-content]]:items-center" orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="settings-board-name">{t("board.settings.name")}</FieldLabel>
          <FieldDescription>{t("board.settings.nameHint")}</FieldDescription>
          {isTooLong && <FieldError>{t("board.settings.nameTooLong", { max: MAX_BOARD_NAME_LENGTH })}</FieldError>}
        </FieldContent>
        <Input
          aria-invalid={isTooLong}
          className="w-56 shrink-0"
          data-testid="settings-board-name"
          id="settings-board-name"
          onBlur={() => saveName()}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("board.settings.namePlaceholder")}
          value={name}
        />
      </Field>
    </form>
  );
}

export function BoardsEnabledSetting() {
  const { t } = useTranslation();
  const { data: settings } = useBoardSettingsQuery();
  const setSettings = useSetBoardSettingsMutation();
  if (!settings) return null;

  return (
    <FieldLabel>
      <Field orientation="horizontal">
        <Checkbox
          checked={settings.enabled}
          data-testid="settings-boards-enabled"
          onCheckedChange={(checked) => setSettings.mutate({ enabled: checked === true })}
        />
        <FieldContent>
          <span>{t("board.settings.showBoards")}</span>
          <FieldDescription>{t("board.settings.showBoardsHint")}</FieldDescription>
        </FieldContent>
      </Field>
    </FieldLabel>
  );
}

// What this computer keeps of each of a teacher's own courses' boards. The
// Settings page shows it to teachers only (leaving the row out entirely).
export function BoardOwnLimitSetting() {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: settings } = useBoardSettingsQuery();
  const setSettings = useSetBoardSettingsMutation();
  if (!settings) return null;

  const ownLimits = OWN_LIMITS.includes(settings.ownLimitBytes)
    ? OWN_LIMITS
    : [...OWN_LIMITS, settings.ownLimitBytes].sort((a, b) => a - b);

  return (
      <Field className="gap-8 has-[>[data-slot=field-content]]:items-center" orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="settings-board-own-limit">{t("board.settings.ownLimit")}</FieldLabel>
          <FieldDescription>{t("board.settings.ownLimitHint")}</FieldDescription>
        </FieldContent>
        <Select
          onValueChange={(value) => {
            if (value !== null) setSettings.mutate({ ownLimitBytes: value });
          }}
          value={settings.ownLimitBytes}
        >
          <SelectTrigger className="w-32 shrink-0" id="settings-board-own-limit">
            <SelectValue>{(value: number) => formatFileSize(value, locale)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ownLimits.map((limit) => (
              <SelectItem key={limit} value={limit}>
                {formatFileSize(limit, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
  );
}
