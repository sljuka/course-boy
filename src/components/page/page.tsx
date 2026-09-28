import type { ReactNode } from "react";

import { PageBreadcrumbs, type PageBreadcrumb } from "@/components/page/page-breadcrumbs";
import { PageBody } from "@/components/ui/page-panel";
import {
  PageToolbar,
  PageToolbarCenter,
  PageToolbarEnd,
  PageToolbarStart,
} from "@/components/ui/page-toolbar";
import { useLayoutBreadcrumbs } from "@/lib/use-layout-breadcrumbs";
import { cn } from "@/lib/utils";

type PageProps = {
  // Where this page sits, shown at the start of the toolbar (last = this page).
  // Defaults to the route layout's trail (`LayoutBreadcrumbsContext`), if any.
  breadcrumbs?: readonly PageBreadcrumb[];
  children: ReactNode;
  className?: string;
  // Skip the width cap — for canvases like the block editor that want the full width.
  fullBleed?: boolean;
  // The page's own heading block (title, description, badges) at the top of
  // the scrolling content.
  header?: ReactNode;
  // Page actions at the end of the toolbar (Import, Create, Preview, …).
  toolbarActions?: ReactNode;
  // An optional control centred in the toolbar (e.g. the test stepper).
  toolbarCenter?: ReactNode;
};

// What every page renders inside the layout's `PagePanel`: a toolbar that
// stays put (breadcrumbs · centre · actions) above a scrolling body with a
// centred content column. Layout-only — visual styling lives in the `ui`
// primitives it composes. See docs/working-conventions.md.
export function Page({
  breadcrumbs,
  children,
  className,
  fullBleed,
  header,
  toolbarActions,
  toolbarCenter,
}: PageProps) {
  const layoutBreadcrumbs = useLayoutBreadcrumbs();
  const trail = breadcrumbs ?? layoutBreadcrumbs ?? undefined;
  const hasToolbar = Boolean(trail?.length || toolbarActions || toolbarCenter);

  return (
    <>
      {hasToolbar && (
        <PageToolbar>
          <PageToolbarStart>
            {trail && trail.length > 0 && <PageBreadcrumbs items={trail} />}
          </PageToolbarStart>
          {toolbarCenter && <PageToolbarCenter>{toolbarCenter}</PageToolbarCenter>}
          <PageToolbarEnd>{toolbarActions}</PageToolbarEnd>
        </PageToolbar>
      )}
      <PageBody>
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
    </>
  );
}
