import { SquarePlus, StarOff } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useOptionalAppTabs } from "@/lib/use-app-tabs";
import { useNewTabLink } from "@/lib/use-new-tab-link";

// One link in the app sidebar. Right-click: "Open in new tab" (SLJ-12), and
// for a favorite, "Remove from favorites"; a middle-click or ⌘-click opens it
// in a new tab too.
export function AppSidebarItem({
  badge,
  children,
  href,
  isActive,
  onUnfavorite,
  testId,
  title,
}: {
  // Shown at the item's end, e.g. how many approvals wait.
  badge?: ReactNode;
  children: ReactNode;
  href: string;
  isActive: boolean;
  // A favorite's star, taken off from the menu.
  onUnfavorite?: () => void;
  testId?: string;
  title?: string;
}) {
  const { t } = useTranslation();
  const tabs = useOptionalAppTabs();
  const newTabLink = useNewTabLink(href);

  return (
    <SidebarMenuItem data-testid={testId}>
      <ContextMenu>
        <ContextMenuTrigger className="contents">
          <SidebarMenuButton isActive={isActive} render={<Link to={href} {...newTabLink} />} title={title}>
            {children}
          </SidebarMenuButton>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem onClick={() => tabs?.open(href)}>
            <SquarePlus aria-hidden="true" />
            {t("titleBar.openInNewTab")}
          </ContextMenuItem>
          {onUnfavorite && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onUnfavorite}>
                <StarOff aria-hidden="true" />
                {t("courseProgress.unfavorite")}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {badge}
    </SidebarMenuItem>
  );
}
