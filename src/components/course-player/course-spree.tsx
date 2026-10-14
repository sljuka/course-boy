import { useTranslation } from "react-i18next";

import { StreakCounter } from "@/components/ui/streak-counter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { spreeLevel } from "@/lib/course-progress";

// The course's spree (SLJ-134) in the interactive test player's corner: a
// lightning bolt that lights up and glows brighter the longer it runs, with
// the spree and the best one in its tooltip.
export function CourseSpree({ best, current }: { best: number; current: number }) {
  const { t } = useTranslation();
  const label = t("courseDetails.spree", { best, current });

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <StreakCounter aria-label={label} count={current} data-testid="course-spree" level={spreeLevel(current)} />
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
