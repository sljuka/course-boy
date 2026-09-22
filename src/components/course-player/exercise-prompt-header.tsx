import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { Badge } from "@/components/ui/badge";

/**
 * The numbered-badge + prompt heading shown above an exercise's answer
 * field — shared by `CourseTestContent` (all-at-once) and
 * `InteractiveTestPlayer` so every exercise kind's prompt looks identical
 * regardless of which view is showing it.
 */
export function ExercisePromptHeader({
  index,
  promptSource,
}: {
  index: number;
  promptSource: string;
}) {
  return (
    <p className="flex items-start gap-1.5 text-lg font-medium leading-7 text-foreground">
      <Badge className="size-6 shrink-0 justify-center" variant="secondary">
        {index + 1}
      </Badge>
      <InlineMarkdown source={promptSource} />
    </p>
  );
}
