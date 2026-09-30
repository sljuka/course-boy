import { useEffect, useRef, useState, type ReactNode } from "react";
import { FolderTree, PanelRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageBreadcrumbs, type PageBreadcrumb } from "@/components/page/page-breadcrumbs";
import { Button } from "@/components/ui/button";
import { PageBody } from "@/components/ui/page-panel";
import { PageSidePanel } from "@/components/ui/page-side-panel";
import {
  PageActionBar,
  PageToolbar,
  PageToolbarCenter,
  PageToolbarEnd,
  PageToolbarStart,
} from "@/components/ui/page-toolbar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsCompactSidePanels } from "@/hooks/use-mobile";
import { useLayoutBreadcrumbs } from "@/lib/use-layout-breadcrumbs";
import { usePageSidePanels, type PageSidePanelValue } from "@/lib/use-page-side-panel";
import { cn } from "@/lib/utils";

type PageProps = {
  // Row 2, start: page view controls (tabs, filters, display), after the
  // left-panel toggle if the layout provides a left panel.
  actionBarStart?: ReactNode;
  // Row 2, centre: an optional control (e.g. the interactive test's stepper).
  actionBarCenter?: ReactNode;
  // Row 2, end: the page's actions (Import, Create, Preview, Commit, Print…).
  actions?: ReactNode;
  // Row 1: where this page sits (last = this page). Defaults to the route
  // layout's trail (`LayoutBreadcrumbsContext`), if any.
  breadcrumbs?: readonly PageBreadcrumb[];
  children: ReactNode;
  className?: string;
  // Row 1, right after the last crumb: actions on the item itself (★, ⋯).
  crumbActions?: ReactNode;
  // Skip the width cap — for canvases like the block editor that want the full width.
  fullBleed?: boolean;
  // The page's own heading block (title, description, badges) at the top of
  // the scrolling content.
  header?: ReactNode;
};

// What every page renders inside the layout's `PagePanel`:
//
//   row 1  PageToolbar    breadcrumbs · item actions                 (navigation)
//   row 2  PageActionBar  [left toggle] start · centre · actions [right toggle]
//   body   [left panel]   PageBody (the only scroll area)   [right panel]
//
// Each row shows only when it has something in it. Panels come from the route
// layout (`PageSidePanelsContext`); on narrow windows (below
// `SIDE_PANELS_INLINE_MIN_WIDTH`) they are drawers that start closed.
// Layout-only — visual styling lives in the `ui` primitives it composes.
// See docs/working-conventions.md.
export function Page({
  actionBarCenter,
  actionBarStart,
  actions,
  breadcrumbs,
  children,
  className,
  crumbActions,
  fullBleed,
  header,
}: PageProps) {
  const layoutBreadcrumbs = useLayoutBreadcrumbs();
  const panels = usePageSidePanels();
  // Below the side panels' compact width they become drawers (sheets).
  const isMobile = useIsCompactSidePanels();
  const trail = breadcrumbs ?? layoutBreadcrumbs ?? undefined;
  const hasToolbar = Boolean(trail?.length || crumbActions);
  const hasActionBar = Boolean(
    panels.left || panels.right || actionBarStart || actionBarCenter || actions,
  );

  return (
    <>
      {hasToolbar && (
        <PageToolbar>
          <PageToolbarStart>
            {trail && trail.length > 0 && <PageBreadcrumbs items={trail} />}
            {crumbActions}
          </PageToolbarStart>
        </PageToolbar>
      )}
      {hasActionBar && (
        <PageActionBar>
          <PageToolbarStart>
            {panels.left && (
              <PanelToggle icon={FolderTree} isMobile={isMobile} panel={panels.left} side="left" />
            )}
            {actionBarStart}
          </PageToolbarStart>
          {actionBarCenter && <PageToolbarCenter>{actionBarCenter}</PageToolbarCenter>}
          <PageToolbarEnd>
            {actions}
            {panels.right && (
              <PanelToggle icon={PanelRight} isMobile={isMobile} panel={panels.right} side="right" />
            )}
          </PageToolbarEnd>
        </PageActionBar>
      )}
      <div className="flex min-h-0 flex-1 print:block">
        {panels.left && !isMobile && panels.left.open && (
          <PageSidePanel aria-label={panels.left.label} side="left">
            {panels.left.content}
          </PageSidePanel>
        )}
        <PageBody className="min-w-0">
          <div
            className={cn(
              "mx-auto flex w-full flex-col gap-4 p-4 sm:p-5 lg:p-6 print:block print:max-w-none print:p-0",
              !fullBleed && "max-w-6xl",
              className,
            )}
          >
            {header && <div className="min-w-0">{header}</div>}
            {children}
          </div>
        </PageBody>
        {panels.right && !isMobile && panels.right.open && (
          <PageSidePanel aria-label={panels.right.label} side="right">
            {panels.right.content}
          </PageSidePanel>
        )}
      </div>
    </>
  );
}

// A side panel's toggle in the action bar. Inline on wide windows (the
// layout's `open` state); on narrow ones it opens the panel as a sheet.
function PanelToggle({
  icon: Icon,
  isMobile,
  panel,
  side,
}: {
  icon: typeof FolderTree;
  isMobile: boolean;
  panel: PageSidePanelValue;
  side: "left" | "right";
}) {
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const lastDismissKey = useRef(panel.dismissKey);

  // Picking something in the drawer (its dismiss key changes) closes it.
  useEffect(() => {
    if (lastDismissKey.current !== panel.dismissKey) {
      lastDismissKey.current = panel.dismissKey;
      setIsSheetOpen(false);
    }
  }, [panel.dismissKey]);

  // Widening the window back to inline panels drops the drawer.
  useEffect(() => {
    if (!isMobile) {
      setIsSheetOpen(false);
    }
  }, [isMobile]);

  return (
    <>
      <Button
        aria-label={panel.toggleLabel}
        aria-pressed={isMobile ? isSheetOpen : panel.open}
        onClick={() => (isMobile ? setIsSheetOpen((open) => !open) : panel.onOpenChange(!panel.open))}
        shape="circle"
        size="icon-sm"
        title={panel.toggleLabel}
        variant="subtle"
      >
        <Icon aria-hidden="true" />
      </Button>
      {isMobile && (
        <Sheet onOpenChange={setIsSheetOpen} open={isSheetOpen}>
          <SheetContent
            className="w-72 px-0 pb-0"
            closeLabel={t("drawer.close")}
            // No ✕ on the right drawer (Versions): its top-right corner is where
            // Windows/Linux draw the window buttons. It closes with Esc, a click
            // outside or its toggle.
            showCloseButton={side === "left"}
            side={side}
          >
            <SheetTitle className="sr-only">{panel.label}</SheetTitle>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{panel.content}</div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
