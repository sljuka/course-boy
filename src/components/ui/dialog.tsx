import {
  createContext,
  useContext,
  useEffect,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type DialogContextValue = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("Dialog components must be used within Dialog.");
  }

  return context;
}

function Dialog({
  children,
  onOpenChange,
  open,
}: PropsWithChildren<DialogContextValue>) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <DialogContext.Provider value={{ onOpenChange, open }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogContent({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange, open } = useDialogContext();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
    >
      <button
        aria-label="Close dialog overlay"
        className="absolute inset-0"
        onClick={() => onOpenChange(false)}
        type="button"
      />
      <div
        className={cn(
          "relative flex h-[92vh] w-[96vw] max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-stone-300/80 bg-stone-50 shadow-[0_36px_120px_-40px_rgba(28,25,23,0.55)]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function DialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-stone-200 bg-white/75 px-6 py-5 backdrop-blur sm:px-8",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-2xl font-semibold leading-tight text-stone-950", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm leading-6 text-stone-600", className)}
      {...props}
    />
  );
}

function DialogBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6", className)}
      {...props}
    />
  );
}

function DialogClose({
  "aria-label": ariaLabel = "Close dialog",
  className,
  onClick,
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useDialogContext();

  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-colors hover:bg-stone-100",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          onOpenChange(false);
        }
      }}
      type="button"
    >
      <X aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
};
