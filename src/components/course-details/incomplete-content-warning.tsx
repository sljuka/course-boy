import { useTranslation } from "react-i18next";

import { describeCourseGap } from "@/components/draft-details/describe-course-gap";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CourseItemGap } from "@/lib/course-gaps";
import type { CourseSectionPreview } from "@/lib/course-package";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { useAppState } from "@/lib/use-app-state";

// Up to this many items are listed inline; beyond it the list collapses.
const INLINE_LIMIT = 4;

type IncompleteItem = { gaps: CourseItemGap[]; name: string };

// Every section, document, document's test and standalone test with
// something missing in one of the course's languages (lib/course-gaps.ts;
// the same red dots as the explorer).
function collectIncompleteItems(sections: CourseSectionPreview[], testLabel: string): IncompleteItem[] {
  return sections.flatMap((section) => [
    { gaps: section.gaps ?? [], name: section.title },
    ...section.lessons.flatMap((lesson) => [
      { gaps: lesson.gaps ?? [], name: `${section.title} › ${lesson.title}` },
      { gaps: lesson.testGaps ?? [], name: `${section.title} › ${lesson.title} › ${testLabel}` },
    ]),
    ...section.tests.map((test) => ({ gaps: test.gaps ?? [], name: `${section.title} › ${test.title}` })),
  ]).filter((item) => item.gaps.length > 0);
}

// Shown in the Commit dialog: what isn't written in every language yet. Only a
// warning: a teacher may commit one language before the translation is done.
export function IncompleteContentWarning({ courseId, open }: { courseId: string; open: boolean }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: course } = useCourseDetailsQuery(open ? courseId : undefined, locale);
  const items = collectIncompleteItems(course?.sections ?? [], t("explorer.testLabel"));

  if (items.length === 0) {
    return null;
  }

  const list = (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, index) => (
        <li key={index}>
          {item.name}: {item.gaps.map((gap) => describeCourseGap(gap, t)).join(", ")}
        </li>
      ))}
    </ul>
  );

  return (
    <Alert data-testid="incomplete-content-warning" variant="warning">
      <AlertTitle>{t("courseVersions.incompleteTitle", { count: items.length })}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{t("courseVersions.incompleteDescription")}</span>
        {items.length <= INLINE_LIMIT ? (
          list
        ) : (
          <Collapsible>
            <CollapsibleTrigger>{t("courseVersions.incompleteShow", { count: items.length })}</CollapsibleTrigger>
            <CollapsibleContent>{list}</CollapsibleContent>
          </Collapsible>
        )}
      </AlertDescription>
    </Alert>
  );
}
