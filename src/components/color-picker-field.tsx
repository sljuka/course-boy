import type { ReactElement, ReactNode } from "react";
import { Check } from "lucide-react";

import { ColorSwatch } from "@/components/ui/color-swatch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LIGHT_COLOR_OPTIONS } from "@/lib/color-options";

/** A dropdown offering the shared light-color palette plus a native color input, opened by whatever `trigger` element is passed in. */
export function ColorPickerField({
  children,
  onChange,
  trigger,
  value,
}: {
  children: ReactNode;
  onChange: (color: string) => void;
  trigger: ReactElement;
  value: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger}>{children}</DropdownMenuTrigger>
      <DropdownMenuContent>
        {LIGHT_COLOR_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.hex} onClick={() => onChange(option.hex)}>
            <ColorSwatch color={option.hex} />
            <span>{option.name}</span>
            {value === option.hex && <Check aria-hidden="true" className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {/*
          closeOnClick={false}: the menu closing mid-click would unmount this
          item before the native color input's OS picker gets a chance to
          open from the click.
        */}
        <DropdownMenuItem closeOnClick={false} render={<label className="relative" />}>
          <ColorSwatch color={value} />
          <span>Custom color…</span>
          <input
            aria-label="Custom color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(event) => onChange(event.target.value)}
            type="color"
            value={value.startsWith("#") ? value : "#000000"}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
