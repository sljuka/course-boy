import { type RefObject, useLayoutEffect, useState } from "react";
import { useLocation } from "react-router-dom";

// How far to indent the tab strip so its first tab lines up with the page
// card below (`PagePanel`): the card starts where the sidebar ends, which
// moves as the sidebar opens, closes or becomes a drawer. The title bar sits
// outside the page's layout, so it measures the card rather than reading the
// sidebar's width. Never negative: a card further left than the tabs (the
// sidebar closed, the course player) leaves them where they are.
export function useAlignWithPage(stripRef: RefObject<HTMLElement | null>): number {
  const { pathname } = useLocation();
  const [indent, setIndent] = useState(0);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    const shell = document.querySelector('[data-slot="app-shell-main"]');
    if (!strip) return;

    function measure() {
      const panel = document.querySelector('[data-slot="page-panel"]');
      if (!strip || !panel) {
        setIndent(0);
        return;
      }
      // The strip's own left edge doesn't move with its padding.
      const next = Math.max(0, Math.round(panel.getBoundingClientRect().left - strip.getBoundingClientRect().left));
      setIndent((current) => (current === next ? current : next));
    }

    measure();
    // The card resizes as the sidebar slides (and with the window); a new
    // page may bring a new card.
    const observer = new ResizeObserver(measure);
    const panel = document.querySelector('[data-slot="page-panel"]');
    if (panel) observer.observe(panel);
    if (shell) observer.observe(shell);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [pathname, stripRef]);

  return indent;
}
