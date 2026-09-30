import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// A card inside a page side panel (the editor's Explorer, Versions), like
// Linear's "Properties" card: a "Title ▾" header that collapses the body, and
// an optional action (e.g. "+") at the end of the header.
type PanelCardProps = {
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  title: React.ReactNode
}

function PanelCard({ action, children, className, title }: PanelCardProps) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="panel-card"
      defaultOpen
      className={cn("flex flex-col rounded-lg border border-border/70 bg-card", className)}
    >
      <div data-slot="panel-card-header" className="flex h-9 items-center gap-1 pr-1.5 pl-3">
        <CollapsiblePrimitive.Trigger className="group/panel-card-trigger flex items-center gap-1 rounded-sm text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          {title}
          <ChevronDownIcon
            aria-hidden="true"
            className="size-3.5 text-muted-foreground transition-transform group-not-aria-expanded/panel-card-trigger:-rotate-90"
          />
        </CollapsiblePrimitive.Trigger>
        {action && <div className="ml-auto flex items-center">{action}</div>}
      </div>
      <CollapsiblePrimitive.Panel data-slot="panel-card-content" className="px-1.5 pb-1.5">
        {children}
      </CollapsiblePrimitive.Panel>
    </CollapsiblePrimitive.Root>
  )
}

export { PanelCard }
