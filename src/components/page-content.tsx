import type { ReactNode } from "react";

import { Page } from "@/components/page/page";
import type { PageBreadcrumb } from "@/components/page/page-breadcrumbs";

type PageContentProps = {
  children: ReactNode;
  // Page actions, shown at the end of the page toolbar.
  actions?: ReactNode;
  breadcrumbs?: readonly PageBreadcrumb[];
  /** Skip the max-width cap — for canvases like the block editor that want the full width. */
  fullBleed?: boolean;
  className?: string;
  // The page's own heading block, at the top of the scrolling content.
  pageHero?: ReactNode;
};

// Kept for pages not yet moved to `<Page>` directly (SLJ-13 migration): the
// same thing under its older prop names. New pages should use `Page`.
export const PageContent = ({
  actions,
  breadcrumbs,
  children,
  className,
  fullBleed,
  pageHero,
}: PageContentProps) => {
  return (
    <Page
      breadcrumbs={breadcrumbs}
      className={className}
      fullBleed={fullBleed}
      header={pageHero}
      toolbarActions={actions}
    >
      {children}
    </Page>
  );
};
