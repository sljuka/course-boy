import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// "Show more options" at the bottom of an exercise's fields: what most
// exercises don't need (a kind's own extras, and the image or video above the
// prompt). Starts open when something in it is already set.
export function ExerciseMoreOptions({ children, defaultOpen = false }: { children: ReactNode; defaultOpen?: boolean }) {
  const { t } = useTranslation();

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger data-testid="exercise-more-options">{t("testEditor.moreOptions")}</CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
