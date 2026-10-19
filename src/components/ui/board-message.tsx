import * as React from "react"

import { cn } from "@/lib/utils"

// One message on a course board (SLJ-149): a header line (name, tag, badge,
// date, and the teacher's menu at the end) over the text. Rows are separated
// by a hairline, like a chat log rather than a list of cards.
function BoardMessage({ className, ...props }: React.ComponentProps<"article">) {
  return (
    <article
      data-slot="board-message"
      className={cn("group/board-message flex flex-col gap-1 border-b border-border/60 py-3 last:border-b-0", className)}
      {...props}
    />
  )
}

function BoardMessageHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="board-message-header"
      className={cn("flex min-w-0 items-center gap-2 text-sm", className)}
      {...props}
    />
  )
}

function BoardMessageAuthor({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="board-message-author"
      className={cn("min-w-0 truncate font-medium text-foreground", className)}
      {...props}
    />
  )
}

// The start of the sender's key: tells two people with the same name apart.
function BoardMessageTag({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="board-message-tag"
      className={cn("shrink-0 font-mono text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function BoardMessageTime({ className, ...props }: React.ComponentProps<"time">) {
  return (
    <time
      data-slot="board-message-time"
      className={cn("shrink-0 text-xs text-muted-foreground tabular-nums", className)}
      {...props}
    />
  )
}

function BoardMessageText({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="board-message-text"
      className={cn("text-sm break-words whitespace-pre-wrap text-foreground", className)}
      {...props}
    />
  )
}

export { BoardMessage, BoardMessageAuthor, BoardMessageHeader, BoardMessageTag, BoardMessageText, BoardMessageTime }
