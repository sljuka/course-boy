import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Written addition and subtraction (SLJ-231): numbers stacked by place value
// like on squared paper. A `ColumnSum` holds rows; each row lays its cells
// out right to left (`flex-row-reverse`), so a row lists its cells ones
// first and Tab moves from the ones to the tens, the way the sum is worked.
// Every cell is the same width, so the columns line up.

const columnSumVariants = cva("inline-flex flex-col font-mono text-2xl tabular-nums leading-none text-foreground")

function ColumnSum({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(columnSumVariants(), className)} data-slot="column-sum" {...props} />
}

// `rule`: the line under the numbers, drawn over this row (the answer's).
const columnSumRowVariants = cva("flex flex-row-reverse items-center justify-end", {
  variants: {
    rule: {
      false: "",
      true: "mt-1 border-t-2 border-foreground pt-1",
    },
  },
  defaultVariants: { rule: false },
})

function ColumnSumRow({ className, rule, ...props }: React.ComponentProps<"div"> & VariantProps<typeof columnSumRowVariants>) {
  return <div className={cn(columnSumRowVariants({ rule }), className)} data-slot="column-sum-row" {...props} />
}

// `size`: a digit, or the small row of carries above. `groupStart`: the cell
// starts a group of three read left to right (the hundreds, the hundred
// thousands…), so a gap is left before it, as big numbers are written.
const cellSize = {
  digit: "h-11 w-9 text-2xl",
  carry: "h-7 w-9 text-sm",
}
const cellGroupStart = { false: "", true: "ml-2" }

const columnSumCellVariants = cva("flex shrink-0 items-center justify-center", {
  variants: {
    size: { ...cellSize, carry: `${cellSize.carry} text-muted-foreground` },
    groupStart: cellGroupStart,
  },
  defaultVariants: { size: "digit", groupStart: false },
})

function ColumnSumCell({ className, groupStart, size, ...props }: React.ComponentProps<"span"> & VariantProps<typeof columnSumCellVariants>) {
  return <span className={cn(columnSumCellVariants({ groupStart, size }), className)} data-slot="column-sum-cell" {...props} />
}

// A box the student writes one digit in. `aria-invalid` marks it wrong
// after a check.
const columnSumInputVariants = cva(
  "shrink-0 rounded-md border border-input bg-transparent p-0 text-center font-mono tabular-nums text-foreground caret-transparent outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:bg-destructive/10 aria-invalid:text-destructive dark:bg-input/30",
  {
    variants: {
      size: { digit: cellSize.digit, carry: `${cellSize.carry} border-dashed` },
      groupStart: cellGroupStart,
    },
    defaultVariants: { size: "digit", groupStart: false },
  }
)

function ColumnSumInput({
  className,
  groupStart,
  size,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof columnSumInputVariants>) {
  return (
    <input
      autoComplete="off"
      className={cn(columnSumInputVariants({ groupStart, size }), className)}
      data-slot="column-sum-input"
      inputMode="numeric"
      type="text"
      {...props}
    />
  )
}

export { ColumnSum, ColumnSumCell, ColumnSumInput, ColumnSumRow }
