import { Fragment } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ItemContextMenu } from "@/components/item-context-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useNewTabLink } from "@/lib/use-new-tab-link";

// One step of a page's trail. Earlier steps either navigate (`to`) or select
// something in place (`onSelect`, e.g. an explorer node in the course editor);
// the last step is the current page and is never a link.
export type PageBreadcrumb = {
  // The icon of what the crumb points to — the same one its sidebar or
  // explorer item uses (Home, My courses, course/section folder, lesson, test).
  icon?: LucideIcon;
  label: string;
  onSelect?: () => void;
  to?: string;
};

function CrumbContent({ item }: { item: PageBreadcrumb }) {
  const Icon = item.icon;

  return (
    <>
      {Icon && <Icon aria-hidden="true" />}
      <span>{item.label}</span>
    </>
  );
}

// A crumb that goes somewhere: a middle-click or ⌘-click opens it in a new
// tab, and so does right-click → Open in new tab (SLJ-12).
function CrumbLink({ item, to }: { item: PageBreadcrumb; to: string }) {
  const newTabLink = useNewTabLink(to);

  return (
    <ItemContextMenu href={to}>
      <BreadcrumbLink render={<Link to={to} {...newTabLink} />}>
        <CrumbContent item={item} />
      </BreadcrumbLink>
    </ItemContextMenu>
  );
}

export function PageBreadcrumbs({ items }: { items: readonly PageBreadcrumb[] }) {
  const { t } = useTranslation();

  return (
    <Breadcrumb aria-label={t("page.breadcrumbs")} className="min-w-0">
      <BreadcrumbList>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <Fragment key={`${index}-${item.label}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isCurrent ? (
                  <BreadcrumbPage>
                    <CrumbContent item={item} />
                  </BreadcrumbPage>
                ) : item.to ? (
                  <CrumbLink item={item} to={item.to} />
                ) : (
                  <BreadcrumbLink onClick={item.onSelect}>
                    <CrumbContent item={item} />
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
