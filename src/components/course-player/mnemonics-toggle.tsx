import { Lightbulb, LightbulbOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCourseMnemonics, useShowMnemonics } from "@/lib/use-course-mnemonics";

// The player's on/off switch for course mnemonics (SLJ-37), only when the
// course has any. The choice is the student's and applies to every course.
export function MnemonicsToggle({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { all } = useCourseMnemonics(courseId);
  const [show, setShow] = useShowMnemonics();

  if (all.length === 0) {
    return null;
  }

  const label = show ? t("mnemonics.hide") : t("mnemonics.show");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            aria-pressed={show}
            data-testid="toggle-mnemonics"
            onClick={() => setShow(!show)}
            shape="circle"
            size="icon-sm"
            variant="subtle"
          />
        }
      >
        {show ? <Lightbulb aria-hidden="true" /> : <LightbulbOff aria-hidden="true" />}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
