import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EditorStatusBarProps = {
  action?: ReactNode;
  message: string;
  onRetry?: () => void;
  status: "dirty" | "error" | "saved" | "saving";
};

export function EditorStatusBar({
  action,
  message,
  onRetry,
  status,
}: EditorStatusBarProps) {
  return (
    <div className="border-t border-stone-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {status === "error" ? (
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-red-600" />
          ) : status === "saving" ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
            />
          ) : status === "dirty" ? (
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-stone-400"
            />
          ) : (
            <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span
            className={cn(
              "text-sm text-muted-foreground",
              status === "error" && "text-red-700",
            )}
          >
            {message}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === "error" && onRetry && (
            <Button onClick={onRetry} size="sm" variant="secondary">
              Retry save
            </Button>
          )}
          {action}
        </div>
      </div>
    </div>
  );
}
