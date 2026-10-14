import { createContext, useContext, useEffect } from "react";

// Full screen for writing (the document editor's "Full screen") and for
// reading (the course player's, SLJ-133): the window goes full screen (the
// browser's Fullscreen API, which the window's security setup allows; see
// electron/window-security.ts) and the app's chrome steps aside: the title
// bar, the app sidebar, the page's toolbars and side panels. What's left is
// the page's own content, at a reading width, and the save status at the
// bottom. The player keeps its action bar, which it can't be used without
// (`Page`'s `keepsActionBarInFullScreen`). Esc, the page's "Exit full
// screen" or the OS ending full screen all leave it.
export type ImmersiveMode = {
  enter: () => void;
  exit: () => void;
  isImmersive: boolean;
  toggle: () => void;
};

export const ImmersiveModeContext = createContext<ImmersiveMode>({
  enter: () => {},
  exit: () => {},
  isImmersive: false,
  toggle: () => {},
});

export function useImmersiveMode(): ImmersiveMode {
  return useContext(ImmersiveModeContext);
}

// "⌘⇧F" on macOS, "Ctrl+Shift+F" elsewhere: the shortcut that toggles it.
export const IMMERSIVE_SHORTCUT_LABEL =
  typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘⇧F" : "Ctrl+Shift+F";

export function isImmersiveShortcut(event: KeyboardEvent): boolean {
  return event.shiftKey && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f";
}

// For a page that offers full screen: ⌘⇧F / Ctrl+Shift+F toggles it while
// the page is open, and closing the page leaves it.
export function useImmersiveModeShortcut(): void {
  const { exit, toggle } = useImmersiveMode();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isImmersiveShortcut(event)) return;
      event.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);
  useEffect(() => exit, [exit]);
}
