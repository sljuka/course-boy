import { useEffect } from "react";

// Enter does a screen's main action, like submitting a form: the test's start
// screen (Start) and its results cards (Continue). Also when the focus has
// moved off that button (a click on the page), unless it's on another button,
// a link or a field, which keeps its own Enter.
export function useEnterKey(onEnter: () => void): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.defaultPrevented || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [role='menuitem']")) return;
      event.preventDefault();
      onEnter();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEnter]);
}
