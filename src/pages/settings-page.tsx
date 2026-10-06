import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PublisherIdentitySettings } from "@/components/identity/publisher-identity-settings";
import { PageContent } from "@/components/page-content";
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePreviousVersionsToKeep } from "@/lib/previous-versions-queries";
import type { UserRole } from "@/lib/preferences";
import { useShowBundledCourses } from "@/lib/show-bundled-courses-queries";
import { useAppState } from "@/lib/use-app-state";

const roleOptions: UserRole[] = ["student", "teacher"];

// Must match MAX_PREVIOUS_VERSIONS_TO_KEEP in electron/course-paths.ts.
const previousVersionsOptions = Array.from({ length: 11 }, (_, count) => count);

export const SettingsPage = () => {
  const { t } = useTranslation();
  const { role, setRole } = useAppState();
  const [showBundledCourses, setShowBundledCourses] = useShowBundledCourses();
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
      <FieldSet className="max-w-xl">
        <FieldLegend>{t("settings.role.title")}</FieldLegend>
        <FieldDescription>{t("settings.role.description")}</FieldDescription>
        <RadioGroup
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
      </FieldSet>
      <FieldSet className="max-w-xl">
        <FieldLegend>{t("settings.home.title")}</FieldLegend>
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
      </FieldSet>
      <FieldSet className="max-w-xl">
        <FieldLegend>{t("settings.courseVersions.title")}</FieldLegend>
        <Field>
          <FieldLabel htmlFor="settings-previous-versions">
            {t("settings.courseVersions.previousToKeep")}
          </FieldLabel>
          {/* A vertical Field stretches its direct children; keep the select narrow. */}
          <div>
            <Select
              onValueChange={(value) => value !== null && setPreviousVersionsToKeep(Number(value))}
              value={String(previousVersionsToKeep)}
            >
              <SelectTrigger className="w-24" id="settings-previous-versions">
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
          </div>
          <FieldDescription>{t("settings.courseVersions.previousToKeepDescription")}</FieldDescription>
        </Field>
      </FieldSet>
      <PublisherIdentitySettings />
    </PageContent>
  );
};
