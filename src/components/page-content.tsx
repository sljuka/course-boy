import type { ReactNode } from "react";

import { PageActions } from "@/components/page-actions";
import { cn } from "@/lib/utils";

type PageContentProps = {
  children: ReactNode;
  /**
   * Action buttons for this page. On large screens they render inline next
   * to `pageHero`; on small screens they move up into a sticky header bar,
   * so a page only ever declares its actions once. (The sidebar toggle that
   * used to share that bar now lives in the window title bar.)
   */
  actions?: ReactNode;
  /** Skip the max-width cap — for canvases like the block editor that want the full width. */
  fullBleed?: boolean;
  className?: string;
  /**
   * The page's own heading — usually just a label (`<Eyebrow>`), but can
   * also carry a back link and/or a short description above/below it.
   * Rendered once, as the first thing in the scrollable content, with
   * `actions` shown inline next to it on large screens.
   */
  pageHero?: ReactNode;
};

export const PageContent = ({
  actions,
  children,
  className,
  fullBleed,
  pageHero,
}: PageContentProps) => {
  return (
    <div className="flex w-full flex-col">
      {actions && (
        <div className="sticky top-(--app-titlebar-height) z-20 flex items-center justify-end gap-3 border-b border-border bg-background px-4 py-2 lg:hidden print:hidden">
          <PageActions>{actions}</PageActions>
        </div>
      )}
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-4 p-4 sm:p-5 lg:p-6",
          !fullBleed && "lg:max-w-6xl",
          className,
        )}
      >
        {(pageHero || actions) && (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">{pageHero}</div>
            {actions && <PageActions className="hidden lg:flex">{actions}</PageActions>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
