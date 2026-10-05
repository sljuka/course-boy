import * as React from "react"

import { cn } from "@/lib/utils"

// Label/value pairs in a side panel, like Linear's issue Properties: a muted
// label column and the value beside it, one compact line each. Values may wrap
// (a long id); `mono` sets ids and codes in the monospace font.
function PropertyList({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="property-list"
      className={cn("grid grid-cols-[minmax(5.5rem,auto)_1fr] gap-x-3 gap-y-1.5 px-1.5 py-1 text-sm", className)}
      {...props}
    />
  )
}

function PropertyRow({
  children,
  label,
  mono = false,
  title,
}: {
  children: React.ReactNode
  label: React.ReactNode
  mono?: boolean
  title?: string
}) {
  return (
    <>
      <dt data-slot="property-label" className="text-muted-foreground">
        {label}
      </dt>
      <dd
        data-slot="property-value"
        className={cn("min-w-0 break-words text-foreground", mono && "font-mono text-xs leading-5 break-all")}
        title={title}
      >
        {children}
      </dd>
    </>
  )
}

export { PropertyList, PropertyRow }
