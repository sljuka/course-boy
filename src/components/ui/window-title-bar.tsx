import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The app-drawn window title bar: the top row of the app frame (`AppShell`;
// the native one is hidden — see `titleBarStyle` in electron/main.ts). It
// shares the sidebar's background and has no bottom border, so bar and sidebar
// read as one continuous surface (the sidebar container has no top border
// either, for the same reason). The
// whole strip is a drag region, so the window can be moved by grabbing it;
// anything clickable inside must sit in a `WindowTitleBarGroup`, which opts
// back out of dragging. Height and the insets that keep clear of the OS window
// controls come from the `--app-titlebar-*` variables in src/index.css.
function WindowTitleBar({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="window-title-bar"
      className={cn(
        "relative z-40 flex h-(--app-titlebar-height) shrink-0 items-center justify-between gap-2 bg-sidebar pr-[max(var(--app-titlebar-inset-right),--spacing(2))] pl-[max(var(--app-titlebar-inset-left),--spacing(2))] text-sidebar-foreground select-none [-webkit-app-region:drag] print:hidden",
        className,
      )}
      {...props}
    />
  );
}

function WindowTitleBarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="window-title-bar-group"
      className={cn("flex items-center gap-0.5 [-webkit-app-region:no-drag]", className)}
      {...props}
    />
  );
}

// An icon button styled like the sidebar's own items (same hover/active
// colours), since the bar shares the sidebar's background — the stock `ghost`
// hover colour would be invisible against it.
function WindowTitleBarButton({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <Button
      className={cn(
        "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground disabled:opacity-40 dark:hover:bg-sidebar-accent/50",
        className,
      )}
      size="icon-sm"
      variant="ghost"
      {...props}
    />
  );
}

export { WindowTitleBar, WindowTitleBarButton, WindowTitleBarGroup };
