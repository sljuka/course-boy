import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ImmersiveModeContext } from "@/lib/use-immersive-mode";

// Holds the full-screen-for-writing mode; see lib/use-immersive-mode.ts.
export function ImmersiveModeProvider({ children }: { children: ReactNode }) {
  const [isImmersive, setIsImmersive] = useState(false);
  // The window went full screen for this (the request can be refused); only
  // then does leaving full screen also leave the mode.
  const enteredFullscreenRef = useRef(false);

  const exit = useCallback(() => {
    setIsImmersive(false);
    enteredFullscreenRef.current = false;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, []);

  const enter = useCallback(() => {
    setIsImmersive(true);
    void document.documentElement
      .requestFullscreen?.()
      .then(() => {
        enteredFullscreenRef.current = true;
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback(() => (isImmersive ? exit() : enter()), [enter, exit, isImmersive]);

  useEffect(() => {
    if (!isImmersive) return;

    // Esc leaves it (Electron, unlike a browser, doesn't end the page's full
    // screen on Esc by itself). A menu open in the editor (the slash menu,
    // say) handles its own Esc first.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) exit();
    }
    function onFullscreenChange() {
      if (!document.fullscreenElement && enteredFullscreenRef.current) exit();
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [exit, isImmersive]);

  const value = useMemo(() => ({ enter, exit, isImmersive, toggle }), [enter, exit, isImmersive, toggle]);

  return <ImmersiveModeContext.Provider value={value}>{children}</ImmersiveModeContext.Provider>;
}
