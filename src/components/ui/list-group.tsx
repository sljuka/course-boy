import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// A Linear-style list section: a header band (chevron, icon, title, count,
// optional action) that collapses the rows under it. Rows are `ListRow`s.
function ListGroup({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="list-group" defaultOpen {...props} />
}

type ListGroupHeaderProps = {
  // An action at the end of the band, e.g. a "+" icon button.
  action?: React.ReactNode
  count: number
  icon?: React.ReactNode
  title: React.ReactNode
  className?: string
}

function ListGroupHeader({ action, className, count, icon, title }: ListGroupHeaderProps) {
  return (
    <div
      data-slot="list-group-header"
      className={cn("flex h-9 items-center gap-2 rounded-md bg-muted/60 pr-1.5 pl-2", className)}
    >
      <CollapsiblePrimitive.Trigger className="group/list-group-trigger flex min-w-0 flex-1 items-center gap-2 self-stretch text-sm font-medium text-foreground outline-none focus-visible:underline">
        <ChevronRightIcon
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground transition-transform group-aria-expanded/list-group-trigger:rotate-90"
        />
        {icon}
        <span className="truncate">{title}</span>
        <span className="text-muted-foreground tabular-nums">{count}</span>
      </CollapsiblePrimitive.Trigger>
      {action}
    </div>
  )
}

function ListGroupContent({ className, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="list-group-content"
      className={cn("flex flex-col py-1", className)}
      {...props}
    />
  )
}

export { ListGroup, ListGroupContent, ListGroupHeader }
