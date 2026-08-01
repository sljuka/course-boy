import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type DropdownMenuTriggerChildProps = {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  ref?: React.Ref<HTMLElement>;
};

type DropdownMenuContextValue = {
  contentId: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(
  null,
);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);

  if (!context) {
    throw new Error("DropdownMenu components must be used within DropdownMenu");
  }

  return context;
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentId = React.useId();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider
      value={{ contentId, open, setOpen, triggerRef }}
    >
      <div className="relative inline-flex" ref={containerRef}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<DropdownMenuTriggerChildProps>;
}) {
  const { contentId, open, setOpen, triggerRef } = useDropdownMenuContext();

  const triggerProps = {
    "aria-controls": contentId,
    "aria-expanded": open,
    "aria-haspopup": "menu" as const,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);

      if (!event.defaultPrevented) {
        setOpen((currentOpen) => !currentOpen);
      }
    },
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;

      const childRef = children.props.ref;

      if (typeof childRef === "function") {
        childRef(node);
      } else if (childRef && typeof childRef === "object") {
        childRef.current = node;
      }
    },
  };

  if (asChild) {
    return React.cloneElement(children, triggerProps);
  }

  return <button type="button" {...triggerProps}>{children}</button>;
}

function DropdownMenuContent({
  align = "end",
  children,
  className,
}: {
  align?: "start" | "end";
  children: React.ReactNode;
  className?: string;
}) {
  const { contentId, open } = useDropdownMenuContext();

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-full z-50 mt-2 min-w-48 overflow-hidden rounded-md border border-stone-200 bg-white p-1 shadow-md",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
      id={contentId}
      role="menu"
    >
      {children}
    </div>
  );
}

function DropdownMenuLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-2 py-1 text-xs font-medium text-stone-500",
        className,
      )}
    >
      {children}
    </div>
  );
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-stone-100", className)} />;
}

function DropdownMenuCheckboxItem({
  checked,
  children,
  onCheckedChange,
}: {
  checked: boolean;
  children: React.ReactNode;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm leading-5 text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      onClick={() => onCheckedChange(!checked)}
      role="menuitemcheckbox"
      type="button"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        <Check
          aria-hidden="true"
          className={cn("h-4 w-4 text-stone-900", !checked && "opacity-0")}
        />
      </span>
      <span>{children}</span>
    </button>
  );
}

function DropdownMenuRadioGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div role="group">{children}</div>;
}

function DropdownMenuRadioItem({
  children,
  onSelect,
  selected,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-checked={selected}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm leading-5 text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      onClick={onSelect}
      role="menuitemradio"
      type="button"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        <Check
          aria-hidden="true"
          className={cn("h-4 w-4 text-stone-900", !selected && "opacity-0")}
        />
      </span>
      <span>{children}</span>
    </button>
  );
}

function DropdownMenuItem({
  className,
  children,
  onSelect,
}: {
  className?: string;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  const { setOpen } = useDropdownMenuContext();

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm leading-5 font-medium text-stone-900 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        className,
      )}
      onClick={() => {
        onSelect();
        setOpen(false);
      }}
      role="menuitem"
      type="button"
    >
      {children}
    </button>
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
