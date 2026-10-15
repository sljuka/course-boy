import { useLayoutEffect, useRef } from "react";

// Where a page's side panel attaches content kept alive across pages (see
// `usePersistentPanelContent`).
export function PanelContentOutlet({ host }: { host: HTMLElement }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.appendChild(host);
    return () => {
      // Another page's outlet may have taken it already.
      if (host.parentNode === container) container.removeChild(host);
    };
  }, [host]);

  return <div className="contents" ref={containerRef} />;
}
