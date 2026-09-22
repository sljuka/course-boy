import { cn } from "@/lib/utils";

/**
 * An underline used to mark a word in running text — e.g. by word type.
 * Unmarked uses `muted-foreground` rather than the (much subtler) `border`
 * token, since `border` is nearly invisible in dark mode and this dashed
 * underline is often the only cue that a word is clickable — see
 * `WordTypeTokens`, whose `<button>` wrapper adds `group` so the
 * `group-hover` state below only activates for actually-clickable words.
 */
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
        "border-b-[3px] pb-0 transition-[color,opacity]",
        marked
          ? // `color` is an arbitrary per-type hex applied via inline style
            // below, which always wins over a `group-hover` border-color
            // class at equal specificity — dim instead, which doesn't fight
            // the inline style and needs no per-color hover value.
            "border-solid group-hover:opacity-70"
          : "border-dashed border-muted-foreground group-hover:border-foreground",
        className,
      )}
      style={marked && color ? { borderColor: color, ...style } : style}
      {...props}
    />
  );
}

export { WordMarker };
