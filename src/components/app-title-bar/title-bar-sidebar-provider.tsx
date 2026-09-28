import { useCallback, useMemo, useState, type ReactNode } from "react";

import { TitleBarSidebarContext } from "@/lib/use-title-bar-sidebar";

function TitleBarSidebarProvider({ children }: { children: ReactNode }) {
  // Wrapped in an object: storing a bare function in state would make React
  // treat it as an updater.
  const [registered, setRegistered] = useState<{ toggle: () => void } | null>(null);

  const register = useCallback((toggle: () => void) => {
    setRegistered({ toggle });

    // Only unregister if nothing newer has taken over in the meantime.
    return () => setRegistered((current) => (current?.toggle === toggle ? null : current));
  }, []);

  const value = useMemo(
    () => ({ register, toggle: registered?.toggle ?? null }),
    [register, registered],
  );

  return <TitleBarSidebarContext.Provider value={value}>{children}</TitleBarSidebarContext.Provider>;
}

export { TitleBarSidebarProvider };
