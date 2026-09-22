import { cn } from "@/lib/utils";

/** A small round color indicator — e.g. for a color picker's options and trigger. */
function ColorSwatch({
  className,
  color,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block size-4 shrink-0 rounded-full border border-border", className)}
      style={{ backgroundColor: color }}
      {...props}
    />
  );
}

export { ColorSwatch };
