import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

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
import type { UserRole } from "@/lib/preferences";
import { useShowBundledCourses } from "@/lib/show-bundled-courses-queries";
import { useAppState } from "@/lib/use-app-state";

const roleOptions: UserRole[] = ["student", "teacher"];

export const SettingsPage = () => {
  const { t } = useTranslation();
  const { role, setRole } = useAppState();
  const [showBundledCourses, setShowBundledCourses] = useShowBundledCourses();

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
    </PageContent>
  );
};
