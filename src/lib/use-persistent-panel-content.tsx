import { type ReactNode, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { PanelContentOutlet } from "@/components/page/panel-content-outlet";

// A side panel's content kept alive across pages (SLJ-131). A layout's side
// panel is drawn by each page (`Page`), so moving to another page would mount
// a new copy of it: the course editor's explorer lost a click that started
// on the old copy just before the page switched (the click never completes
// on an element that's gone), and forgot which sections were collapsed.
//
// Instead the layout renders the content once, into an element of its own
// (`portal`), and each page's panel attaches that element (`outlet`). A page
// switch only moves the element: the same DOM nodes and React state, in the
// same commit, so nothing flashes. Render `portal` inside the layout's
// providers, where the content was written; give the panel `outlet`.
export function usePersistentPanelContent(content: ReactNode): { outlet: ReactNode; portal: ReactNode } {
  const [host] = useState(() => {
    const element = document.createElement("div");
    // Lays its content out as if the host weren't there.
    element.style.display = "contents";
    return element;
  });

  // The same element every time, so a layout can memoize what holds it.
  const outlet = useMemo(() => <PanelContentOutlet host={host} />, [host]);

  return { outlet, portal: createPortal(content, host) };
}
