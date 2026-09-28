import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EditorStatusBarProps = {
  action?: ReactNode;
  message: string;
  onRetry?: () => void;
  // Translated by the caller: ui components hold no copy of their own.
  retryLabel: string;
  status: "dirty" | "error" | "saved" | "saving";
};

export function EditorStatusBar({
  action,
  message,
  onRetry,
  retryLabel,
  status,
}: EditorStatusBarProps) {
  // Content for the app frame's status bar (see `AppStatusBarEnd`): no
  // background or border of its own, sized to the bar's text.
  return (
    <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {status === "error" ? (
            <AlertCircle aria-hidden="true" className="size-3.5 shrink-0 text-destructive" />
          ) : status === "saving" ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-3.5 shrink-0 animate-spin text-muted-foreground"
            />
          ) : status === "dirty" ? (
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground"
            />
          ) : (
            <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" />
          )}
          <span className={cn("truncate", status === "error" && "text-destructive")}>
            {message}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === "error" && onRetry && (
            <Button onClick={onRetry} size="xs" variant="secondary">
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
    </div>
  );
}
