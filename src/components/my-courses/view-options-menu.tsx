import { LayoutGrid, LayoutList, Rows3, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CourseListView } from "@/lib/course-list-view";

// A course list's view options (My courses, Home, a program's page), behind one icon button in
// the action bar. Layout today; sorting and grouping options can join this
// menu later.
export function ViewOptionsMenu({
  onViewChange,
  view,
}: {
  onViewChange: (view: CourseListView) => void;
  view: CourseListView;
}) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t("myCourses.viewOptions")}
            data-testid="view-options"
            shape="circle"
            size="icon-sm"
            title={t("myCourses.viewOptions")}
            variant="subtle"
          />
        }
      >
        <SlidersHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("myCourses.layout")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(value) => onViewChange(value as CourseListView)}
            value={view}
          >
            <DropdownMenuRadioItem data-testid="view-option-table" value="table">
              <Rows3 aria-hidden="true" />
              {t("myCourses.layoutTable")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem data-testid="view-option-list" value="list">
              <LayoutList aria-hidden="true" />
              {t("myCourses.layoutList")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem data-testid="view-option-cards" value="cards">
              <LayoutGrid aria-hidden="true" />
              {t("myCourses.layoutCards")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
