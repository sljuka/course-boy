import { Link2, SquarePlus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useOptionalAppTabs } from "@/lib/use-app-tabs";

export type ItemContextAction = {
  icon: LucideIcon;
  id: string;
  label: string;
  onSelect: () => void;
};

// An item in a list (a program, an approval) on right-click (SLJ-12): Open
// in new tab, Copy link when it has a `matko://` link (SLJ-60), then what
// fits the item (`actions`). `children` is the row; courses have their own,
// `CourseContextMenu`.
export function ItemContextMenu({
  actions = [],
  children,
  copyCode,
  copyLink,
  href,
}: {
  actions?: ItemContextAction[];
  children: ReactNode;
  // A program's or channel's "Copy code" (`ProgramCopyCodeItem`), after Copy link.
  copyCode?: ReactNode;
  copyLink?: string;
  href: string;
}) {
  const { t } = useTranslation();
  const tabs = useOptionalAppTabs();

  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents">{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => tabs?.open(href)}>
          <SquarePlus aria-hidden="true" />
          {t("titleBar.openInNewTab")}
        </ContextMenuItem>
        {copyLink && (
          <ContextMenuItem onClick={() => void navigator.clipboard.writeText(copyLink)}>
            <Link2 aria-hidden="true" />
            {t("appLinks.copyLink")}
          </ContextMenuItem>
        )}
        {copyCode}
        {actions.length > 0 && <ContextMenuSeparator />}
        {actions.map((action) => (
          <ContextMenuItem key={action.id} onClick={action.onSelect}>
            <action.icon aria-hidden="true" />
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
