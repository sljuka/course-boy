import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

const SelectValue = SelectPrimitive.Value;

const selectTriggerVariants = cva(
  "flex w-full items-center justify-between gap-2 border border-stone-300 bg-white text-left font-medium text-stone-700 outline-none transition focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-stone-500",
  {
    variants: {
      uiSize: {
        default: "h-10 rounded-md px-3.5 text-sm",
        sm: "h-8 rounded-md px-3 text-xs",
      },
    },
    defaultVariants: {
      uiSize: "default",
    },
  },
);

function SelectTrigger({
  className,
  children,
  uiSize,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> &
  VariantProps<typeof selectTriggerVariants>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        selectTriggerVariants({ uiSize }),
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="text-stone-500">
        <span aria-hidden="true">▾</span>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "relative z-50 min-w-32 overflow-hidden rounded-md border border-stone-200 bg-white text-stone-950 shadow-lg",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md px-3 py-2 text-sm outline-none transition-colors focus:bg-stone-100 data-[state=checked]:bg-stone-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
