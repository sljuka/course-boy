import { useMemo, useState, type ReactNode } from "react";

import { AppStatusBarContext } from "@/lib/use-app-status-bar";

function AppStatusBarProvider({ children }: { children: ReactNode }) {
  const [endElement, setEndElement] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ endElement, setEndElement }), [endElement]);

  return <AppStatusBarContext.Provider value={value}>{children}</AppStatusBarContext.Provider>;
}

export { AppStatusBarProvider };
