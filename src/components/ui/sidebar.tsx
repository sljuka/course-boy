import * as React from "react";
import { PanelLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarContextValue = {
  isMobile: boolean;
  openDesktop: boolean;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("Sidebar components must be used within SidebarProvider.");
  }

  return context;
}

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [openDesktop, setOpenDesktop] = React.useState(true);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 1024);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((open) => !open);
      return;
    }

    setOpenDesktop((open) => !open);
  }, [isMobile]);

  return (
    <SidebarContext.Provider
      value={{
        isMobile,
        openDesktop,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }}
    >
      <div className="flex min-h-screen w-full">{children}</div>
    </SidebarContext.Provider>
  );
}

function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      className={cn(
        "border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
        className,
      )}
      onClick={(event) => {
        props.onClick?.(event);

        if (!event.defaultPrevented) {
          toggleSidebar();
        }
      }}
      size="icon"
      variant="secondary"
      {...props}
    >
      <PanelLeft aria-hidden="true" className="h-4 w-4" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

type SidebarProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: "left" | "right";
  variant?: "floating" | "inset" | "sidebar";
};

function Sidebar({
  children,
  className,
  side = "left",
  variant = "sidebar",
  ...props
}: SidebarProps) {
  const { isMobile, openDesktop, openMobile, setOpenMobile } = useSidebar();
  const isOpen = isMobile ? openMobile : openDesktop;
  const panelClasses = cn(
    "flex h-full min-h-0 flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]",
    variant === "floating"
      ? "rounded-3xl border bg-white/95 shadow-[0_24px_80px_-32px_rgba(41,37,36,0.35)]"
      : "bg-white/90",
    className,
  );

  return (
    <>
      {isMobile && isOpen ? (
        <button
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-stone-950/25 backdrop-blur-sm lg:hidden"
          onClick={() => setOpenMobile(false)}
          type="button"
        />
      ) : null}
      {isMobile ? (
        <aside
          className={cn(
            "fixed top-0 z-50 h-[100dvh] w-[18rem]",
            side === "right" ? "right-0" : "left-0",
            isOpen
              ? "translate-x-0"
              : side === "right"
                ? "translate-x-full"
                : "-translate-x-full",
          )}
          {...props}
        >
          <div className={panelClasses}>{children}</div>
        </aside>
      ) : (
        <div
          className={cn(
            "relative sticky top-16 h-[calc(100vh-4rem)] shrink-0 self-start overflow-hidden",
            isOpen
              ? "w-64 opacity-100"
              : "w-0 opacity-100",
          )}
        >
          <aside
            className={cn(
              "h-full w-64",
              isOpen
                ? "translate-x-0"
                : side === "right"
                  ? "translate-x-full"
                  : "-translate-x-full",
            )}
            {...props}
          >
            <div className={panelClasses}>{children}</div>
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarInset({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex min-h-screen min-w-0 flex-1 flex-col", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-b border-stone-200 px-4 py-4", className)} {...props} />
  );
}

function SidebarContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-4", className)}
      {...props}
    />
  );
}

function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shrink-0 border-t border-stone-200 px-3 py-4", className)}
      {...props}
    />
  );
}

function SidebarRail({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("h-full w-px shrink-0 bg-stone-200/90", className)}
      {...props}
    />
  );
}

function SidebarGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("space-y-3", className)} {...props} />;
}

function SidebarGroupLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("space-y-1", className)} {...props} />;
}

function SidebarMenuItem({
  className,
  ...props
}: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={cn("list-none", className)} {...props} />;
}

type SidebarMenuButtonChildProps = React.HTMLAttributes<HTMLElement> & {
  className?: string;
};

type SidebarMenuButtonProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
  isActive?: boolean;
};

function SidebarMenuButton({
  asChild,
  children,
  className,
  isActive,
  ...props
}: SidebarMenuButtonProps) {
  const classes = cn(
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    isActive
      ? "bg-amber-100 text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
      : "text-stone-700 hover:bg-stone-100 hover:text-stone-950",
    className,
  );

  if (asChild && React.isValidElement<SidebarMenuButtonChildProps>(children)) {
    return React.cloneElement(children, {
      ...props,
      className: cn(classes, children.props.className),
    });
  }

  return (
    <button
      className={classes}
      type="button"
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
};
