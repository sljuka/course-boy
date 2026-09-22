import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A single on/off disclosure — deliberately distinct from `Accordion`
 * (multi-item, chevron-in-a-menu-row look) so nesting one inside an
 * already-expanded `AccordionContent` (e.g. a numeric exercise's "more
 * options") doesn't read as an accordion stacked inside an accordion.
 */
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  className,
  children,
  ...props
}: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "group/collapsible-trigger inline-flex items-center gap-1 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="size-4 group-aria-expanded/collapsible-trigger:hidden" />
      <ChevronUpIcon className="hidden size-4 group-aria-expanded/collapsible-trigger:inline" />
    </CollapsiblePrimitive.Trigger>
  )
}

function CollapsibleContent({
  className,
  children,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className="overflow-hidden text-sm data-open:animate-collapsible-down data-closed:animate-collapsible-up"
      {...props}
    >
      <div
        className={cn(
          "flex h-(--collapsible-panel-height) flex-col gap-4 pt-3 data-ending-style:h-0 data-starting-style:h-0",
          className
        )}
      >
        {children}
      </div>
    </CollapsiblePrimitive.Panel>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
