import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AgentsSettings } from "@/components/agents/agents-settings";
import { BackgroundSettings } from "@/components/background/background-settings";
import { BoardNameSetting, BoardOwnLimitSetting, BoardsEnabledSetting } from "@/components/course-board/board-settings";
import { PublisherIdentitySettings } from "@/components/identity/publisher-identity-settings";
import { PageContent } from "@/components/page-content";
import { ProfileNameSetting } from "@/components/profile/profile-name-setting";
import { RemoveProfileSetting } from "@/components/profile/remove-profile-setting";
import { SoundEffectsSettings } from "@/components/sound-effects-settings";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSection } from "@/components/ui/settings-section";
import { usePreviousVersionsToKeep } from "@/lib/previous-versions-queries";
import { PERSONAS } from "@/lib/personas";
import type { Persona, Theme, UserRole } from "@/lib/preferences";
import { useProgramThemesPreference } from "@/lib/program-themes-preference";
import { useShowBundledCourses } from "@/lib/show-bundled-courses-queries";
import { useStartTestsInteractivePreference } from "@/lib/start-tests-interactive-preference";
import { useAppState } from "@/lib/use-app-state";

const roleOptions: UserRole[] = ["student", "teacher"];
const themeOptions: Theme[] = ["light", "dark"];

// Must match MAX_PREVIOUS_VERSIONS_TO_KEEP in electron/course-paths.ts.
const previousVersionsOptions = Array.from({ length: 11 }, (_, count) => count);

// Settings: General (profile name, role, Getting Started), Interface (avatar, theme,
// program colors), Sharing
// (versions kept of imported courses, the publishing identity), and last the
// danger zone (removing the profile). Each section is its title above a card
// of its settings.
export const SettingsPage = () => {
  const { t } = useTranslation();
  const { persona, role, setPersona, setRole, setTheme, theme } = useAppState();
  const [showBundledCourses, setShowBundledCourses] = useShowBundledCourses();
  const [useProgramThemes, setUseProgramThemes] = useProgramThemesPreference();
  const { setStartInteractive, startInteractive } = useStartTestsInteractivePreference();
  const [previousVersionsToKeep, setPreviousVersionsToKeep] = usePreviousVersionsToKeep();

  return (
    <PageContent
      breadcrumbs={[{ icon: Settings, label: t("menu.settings") }]}
      pageHero={
        <div className="flex flex-col gap-1">
          <CardTitle size="lg">{t("settings.title")}</CardTitle>
          <CardDescription>{t("settings.subtitle")}</CardDescription>
        </div>
      }
    >
      <SettingsSection title={t("settings.general.title")}>
        <ProfileNameSetting />
        <Field>
          <FieldTitle>{t("settings.role.title")}</FieldTitle>
          <FieldDescription>{t("settings.role.description")}</FieldDescription>
          <RadioGroup
            aria-label={t("settings.role.title")}
            onValueChange={(value) => setRole(value as UserRole)}
            value={role ?? undefined}
          >
            {roleOptions.map((roleOption) => (
              <FieldLabel htmlFor={`settings-role-${roleOption}`} key={roleOption}>
                <Field orientation="horizontal">
                  <RadioGroupItem id={`settings-role-${roleOption}`} value={roleOption} />
                  <FieldContent>
                    <FieldTitle>{t(`roles.${roleOption}`)}</FieldTitle>
                    <FieldDescription>{t(`settings.role.${roleOption}Description`)}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </Field>
        <FieldLabel htmlFor="settings-show-bundled-courses">
          <Field orientation="horizontal">
            <Checkbox
              checked={showBundledCourses}
              id="settings-show-bundled-courses"
              onCheckedChange={(checked) => setShowBundledCourses(checked === true)}
            />
            <FieldContent>
              <FieldTitle>{t("settings.home.showBundledCourses")}</FieldTitle>
              <FieldDescription>{t("settings.home.showBundledCoursesDescription")}</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      </SettingsSection>
      <SettingsSection data-testid="interface-settings" title={t("settings.interface.title")}>
        <Field>
          <FieldTitle>{t("settings.interface.avatar")}</FieldTitle>
          <RadioGroup
            aria-label={t("settings.interface.avatar")}
            className="grid sm:grid-cols-2"
            onValueChange={(value) => setPersona(value as Persona)}
            value={persona ?? undefined}
          >
            {PERSONAS.map((option) => (
              <FieldLabel htmlFor={`settings-avatar-${option.id}`} key={option.id}>
                <Field orientation="horizontal">
                  <RadioGroupItem id={`settings-avatar-${option.id}`} value={option.id} />
                  <img alt="" className="size-10 shrink-0 rounded-full" src={option.imageUrl} />
                  <FieldTitle>{t(option.labelKey)}</FieldTitle>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </Field>
        <Field>
          <FieldTitle>{t("settings.interface.theme")}</FieldTitle>
          <RadioGroup
            aria-label={t("settings.interface.theme")}
            className="grid sm:grid-cols-2"
            onValueChange={(value) => setTheme(value as Theme)}
            value={theme}
          >
            {themeOptions.map((themeOption) => (
              <FieldLabel htmlFor={`settings-theme-${themeOption}`} key={themeOption}>
                <Field orientation="horizontal">
                  <RadioGroupItem id={`settings-theme-${themeOption}`} value={themeOption} />
                  <FieldTitle>{t(`settings.interface.${themeOption}`)}</FieldTitle>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </Field>
        <FieldLabel htmlFor="settings-use-program-themes">
          <Field orientation="horizontal">
            <Checkbox
              checked={useProgramThemes}
              id="settings-use-program-themes"
              onCheckedChange={(checked) => setUseProgramThemes(checked === true)}
            />
            <FieldContent>
              <FieldTitle>{t("settings.interface.useProgramThemes")}</FieldTitle>
              <FieldDescription>{t("settings.interface.useProgramThemesDescription")}</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
        <SoundEffectsSettings />
        <FieldLabel htmlFor="settings-start-tests-interactive">
          <Field orientation="horizontal">
            <Checkbox
              checked={startInteractive}
              id="settings-start-tests-interactive"
              onCheckedChange={(checked) => setStartInteractive(checked === true)}
            />
            <FieldContent>
              <FieldTitle>{t("settings.interface.startTestsInteractive")}</FieldTitle>
              <FieldDescription>{t("settings.interface.startTestsInteractiveDescription")}</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      </SettingsSection>
      {/* Courses from others (versions kept) and yours online: the publishing
          identity (SLJ-55): set up, its file, restore. */}
      <SettingsSection
        data-testid="sharing-settings"
        description={t("settings.sharing.description")}
        title={t("settings.sharing.title")}
      >
        <Field className="gap-8 has-[>[data-slot=field-content]]:items-center" orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="settings-previous-versions">
              {t("settings.courseVersions.previousToKeep")}
            </FieldLabel>
            <FieldDescription>{t("settings.courseVersions.previousToKeepDescription")}</FieldDescription>
          </FieldContent>
          <Select
            onValueChange={(value) => value !== null && setPreviousVersionsToKeep(Number(value))}
            value={String(previousVersionsToKeep)}
          >
            <SelectTrigger className="w-24 shrink-0" id="settings-previous-versions">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {previousVersionsOptions.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <BackgroundSettings />
        <PublisherIdentitySettings />
      </SettingsSection>
      {/* Course boards (SLJ-149): the board name, boards on or off here, and
          how much of your own courses' boards this computer keeps. */}
      <SettingsSection
        data-testid="board-settings"
        description={t("board.settings.description")}
        title={t("board.settings.title")}
      >
        <BoardNameSetting />
        <BoardsEnabledSetting />
        {role === "teacher" && <BoardOwnLimitSetting />}
      </SettingsSection>
      {/* Agents on this computer making courses over MCP (SLJ-68). */}
      <SettingsSection
        data-testid="agents-settings"
        description={t("agents.description")}
        title={t("agents.title")}
      >
        <AgentsSettings />
      </SettingsSection>
      <SettingsSection data-testid="danger-zone" title={t("settings.dangerZone.title")} variant="danger">
        <RemoveProfileSetting />
      </SettingsSection>
    </PageContent>
  );
};
