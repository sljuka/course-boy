import * as React from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// A term that has a course mnemonic (SLJ-37): subtly marked with a dotted
// underline, the mnemonic in a tooltip on hover or keyboard focus. A screen
// reader hears `label` ("Mnemonic: John 📰🍓") after the term; a printout shows
// the mnemonic in brackets, since there's nothing to hover on paper.
const mnemonicTermClassName =
  "cursor-help underline decoration-info/70 decoration-dotted decoration-2 underline-offset-4 outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50"

// The teacher's editor marks terms with ProseMirror decorations, not React:
// the same underline, and the mnemonic in a CSS tooltip from the decoration's
// `data-mnemonic` attribute.
const mnemonicTermDecorationClassName = cn(
  mnemonicTermClassName,
  "relative after:pointer-events-none after:invisible after:absolute after:bottom-full after:left-1/2 after:z-50 after:mb-1 after:-translate-x-1/2 after:rounded-md after:bg-foreground after:px-3 after:py-1.5 after:text-xs after:font-normal after:whitespace-nowrap after:text-background after:no-underline after:opacity-0 after:transition-opacity after:content-[attr(data-mnemonic)] hover:after:visible hover:after:opacity-100"
)

function MnemonicTerm({
  children,
  label,
  mnemonic,
}: {
  children: React.ReactNode
  label: string
  mnemonic: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={mnemonicTermClassName} data-slot="mnemonic-term" data-testid="mnemonic" tabIndex={0} />
        }
      >
        {children}
        <span className="sr-only">{label}</span>
        <span aria-hidden="true" className="hidden print:inline">
          {` (${mnemonic})`}
        </span>
      </TooltipTrigger>
      <TooltipContent data-testid="mnemonic-tooltip">{mnemonic}</TooltipContent>
    </Tooltip>
  )
}

export { MnemonicTerm, mnemonicTermDecorationClassName }
