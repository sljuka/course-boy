import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// "Show more options" at the bottom of an exercise's fields: what most
// exercises don't need (a kind's own extras, its points in a graded test, the
// image or video above the prompt, and reading it aloud). Starts open when something in it is
// already set (`hasMoreOptionsSet`, or a kind's own extras).
export function hasMoreOptionsSet(exercise: object): boolean {
  const { media, points, speech } = exercise as { media?: unknown; points?: number; speech?: unknown };

  return Boolean(media) || points !== undefined || Boolean(speech);
}

export function ExerciseMoreOptions({ children, defaultOpen = false }: { children: ReactNode; defaultOpen?: boolean }) {
  const { t } = useTranslation();

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger data-testid="exercise-more-options">{t("testEditor.moreOptions")}</CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
