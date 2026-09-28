import { createContext, useContext } from "react";

import type { PageBreadcrumb } from "@/components/page/page-breadcrumbs";

// A route layout's default page trail. Pages normally pass `breadcrumbs` to
// `<Page>` themselves; this exists for the course editor, which is a single
// route whose "pages" are explorer selections — so the layout, which owns the
// selection, owns the trail, and every editor page (course, section, lesson,
// test) shows it without threading a prop through each editor component.
// An explicit `breadcrumbs` prop on `<Page>` still wins.
export const LayoutBreadcrumbsContext = createContext<readonly PageBreadcrumb[] | null>(null);

export function useLayoutBreadcrumbs(): readonly PageBreadcrumb[] | null {
  return useContext(LayoutBreadcrumbsContext);
}
