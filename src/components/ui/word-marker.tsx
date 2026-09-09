import { cn } from "@/lib/utils";

/** A subtle underline used to mark a word in running text — e.g. by word type. */
function WordMarker({
  className,
  color,
  marked = false,
  style,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: string; marked?: boolean }) {
  return (
    <span
      className={cn(
        "border-b-[3px] pb-0",
        marked ? "border-solid" : "border-dashed border-stone-300",
        className,
      )}
      style={marked && color ? { borderColor: color, ...style } : style}
      {...props}
    />
  );
}

export { WordMarker };
