import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useAppStatusBar } from "@/lib/use-app-status-bar";

// Renders its children into the end of the app frame's status bar — for route
// layouts with something to show there (the course editor's save status).
function AppStatusBarEnd({ children }: { children: ReactNode }) {
  const { endElement } = useAppStatusBar();

  return endElement ? createPortal(children, endElement) : null;
}

export { AppStatusBarEnd };
