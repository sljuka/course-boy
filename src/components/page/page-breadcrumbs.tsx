import { Fragment } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
                  <BreadcrumbLink render={<Link to={item.to} />}>
                    <CrumbContent item={item} />
                  </BreadcrumbLink>
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
