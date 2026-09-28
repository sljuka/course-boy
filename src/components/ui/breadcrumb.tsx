import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

// Breadcrumb trail for the page toolbar: earlier crumbs muted and clickable,
// the current one in full colour. A crumb's content is an optional icon
// followed by its label in a <span> (which truncates). `BreadcrumbLink` takes a `render` element
// (e.g. `<Link to="/" />`) or `onClick` for crumbs that select something
// rather than navigate.
function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn("flex min-w-0 items-center gap-1.5 text-sm", className)}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("flex min-w-0 items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "inline-flex min-w-0 items-center gap-1.5 rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&>span]:truncate [&>svg]:size-3.5 [&>svg]:shrink-0",
          className,
        ),
        // Only a real <button> gets a type; a rendered <Link> is an <a>.
        ...(render ? {} : { type: "button" as const }),
      },
      props,
    ),
    render,
    state: { slot: "breadcrumb-link" },
  });
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-current="page"
      data-slot="breadcrumb-page"
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground [&>span]:truncate [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      aria-hidden="true"
      data-slot="breadcrumb-separator"
      role="presentation"
      className={cn("shrink-0 text-muted-foreground/60 [&>svg]:size-3.5", className)}
      {...props}
    >
      <ChevronRight />
    </li>
  );
}

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
