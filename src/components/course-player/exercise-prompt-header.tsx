import { useTranslation } from "react-i18next";

import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { Badge } from "@/components/ui/badge";

/**
 * The numbered-badge + prompt heading shown above an exercise's answer
 * field — shared by `CourseTestContent` (all-at-once) and
 * `InteractiveTestPlayer` so every exercise kind's prompt looks identical
 * regardless of which view is showing it. The badge is skipped in
 * interactive mode, where the stepper already shows the current position.
 */
export function ExercisePromptHeader({
  index,
  printPoints,
  promptSource,
  showIndex = true,
}: {
  index: number;
  // A graded test's points for it, printed after the prompt (paper only).
  printPoints?: number;
  promptSource: string;
  showIndex?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <p className="flex items-start gap-1.5 text-lg font-normal leading-7 text-foreground">
      {showIndex && (
        // On paper the badge's background isn't printed, which left a small
        // number centred in an empty box, indented from the text around it:
        // printed, it's a plain "1." in the prompt's own size, flush left.
        <Badge
          className="size-6 shrink-0 justify-center print:h-auto print:w-auto print:justify-start print:gap-0 print:p-0 print:text-lg print:leading-7 print:font-normal"
          variant="secondary"
        >
          {index + 1}
          <span className="hidden print:inline">.</span>
        </Badge>
      )}
      <InlineMarkdown source={promptSource} />
      {printPoints !== undefined && (
        <span className="ml-auto hidden shrink-0 pl-2 whitespace-nowrap text-muted-foreground print:inline">
          ({t("courseDetails.printPoints", { count: printPoints })})
        </span>
      )}
    </p>
  );
}
