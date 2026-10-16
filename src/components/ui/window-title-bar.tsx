import * as React from "react";
import { X } from "lucide-react";

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

// The tabs' row (SLJ-12): takes the bar's free width, and stays a drag region
// between and after the tabs (each tab opts out of dragging itself).
function WindowTitleBarTabs({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="window-title-bar-tabs"
      className={cn("flex min-w-0 flex-1 items-center gap-1", className)}
      role="tablist"
      {...props}
    />
  );
}

// One tab, Linear-style: the active one raised on the page's background, the
// others muted on the bar's. Icon and title select it; × (on hover, and always
// on the active one) and a middle-click close it.
function WindowTitleBarTab({
  active,
  children,
  closeLabel,
  icon: Icon,
  onClose,
  onSelect,
  ...props
}: Omit<React.ComponentProps<"div">, "onSelect"> & {
  active: boolean;
  closeLabel: string;
  icon: React.ComponentType<{ "aria-hidden"?: boolean; className?: string }>;
  onClose: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      data-active={active ? "" : undefined}
      data-slot="window-title-bar-tab"
      className={cn(
        "group/tab relative flex h-7 min-w-16 max-w-48 flex-1 basis-40 items-center rounded-md text-xs [-webkit-app-region:no-drag]",
        active
          ? "bg-background text-foreground shadow-xs"
          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
      )}
      onAuxClick={(event) => {
        if (event.button === 1) {
          event.preventDefault();
          onClose();
        }
      }}
      onMouseDown={(event) => {
        // A middle-click would otherwise start auto-scrolling.
        if (event.button === 1) event.preventDefault();
      }}
      {...props}
    >
      <button
        aria-selected={active}
        className="flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md pr-6 pl-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={onSelect}
        role="tab"
        type="button"
      >
        <Icon aria-hidden className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{children}</span>
      </button>
      <button
        aria-label={closeLabel}
        className={cn(
          "absolute right-1 flex size-5 items-center justify-center rounded-sm text-current opacity-0 outline-none group-hover/tab:opacity-70 hover:bg-sidebar-accent hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50",
          active && "opacity-70",
        )}
        onClick={onClose}
        title={closeLabel}
        type="button"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </div>
  );
}

export { WindowTitleBar, WindowTitleBarButton, WindowTitleBarGroup, WindowTitleBarTab, WindowTitleBarTabs };
