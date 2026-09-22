import { Contrast } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/preferences";

export function ThemeToggle({
  onThemeChange,
  theme,
}: {
  onThemeChange: (theme: Theme) => void;
  theme: Theme;
}) {
  const { t } = useTranslation();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      aria-label={t(nextTheme === "dark" ? "theme.switchToDark" : "theme.switchToLight")}
      onClick={() => onThemeChange(nextTheme)}
      shape="circle"
      size="icon"
      variant="outline"
    >
      <Contrast aria-hidden="true" className="h-4 w-4" />
    </Button>
  );
}
