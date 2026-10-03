import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCourseSharingQuery, useSwitchCourseVersionMutation } from "@/lib/sharing-queries";

// An imported course's version, as a menu of the versions kept on this device
// (SLJ-40): picking one switches to it with no download. With only one version
// kept it's a plain badge.
export function CourseVersionMenu({ courseId, version }: { courseId: string; version: string }) {
  const { t } = useTranslation();
  const { data: sharing } = useCourseSharingQuery(courseId);
  const switchMutation = useSwitchCourseVersionMutation();
  const kept = sharing?.versions?.kept ?? [];
  const current = sharing?.versions?.current ?? version;

  if (kept.length < 2) {
    return (
      <Badge className="font-normal" variant="secondary">
        {t("courseSearch.version", { version })}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button data-testid="course-version-menu" disabled={switchMutation.isPending} size="xs" variant="secondary" />
        }
      >
        {t("courseSearch.version", { version: current })}
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup
          onValueChange={(value) =>
            typeof value === "string" && value !== current && switchMutation.mutate({ courseId, version: value })
          }
          value={current}
        >
          <DropdownMenuLabel>{t("courseUpdates.versionsOnDevice")}</DropdownMenuLabel>
          {kept.map((keptVersion, index) => (
            // Radio items keep the menu open by default; switching is the
            // whole action here, so close it.
            <DropdownMenuRadioItem closeOnClick key={keptVersion} value={keptVersion}>
              {index === 0 ? t("courseUpdates.newestVersion", { version: keptVersion }) : keptVersion}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
