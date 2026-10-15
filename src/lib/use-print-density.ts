import { useEffect } from "react";

import type { CoursePrintDensity } from "@/lib/print-options";

// Print size (SLJ-142): marks the document so the print styles in index.css
// shrink the root font size and the page margins for standard and compact.
// Everything sized in rem (text, spacing, answer lines) shrinks with it.
// Only while the player that asked for it is open; comfortable needs no mark.
export function usePrintDensity(density: CoursePrintDensity) {
  useEffect(() => {
    if (density === "comfortable") {
      return;
    }

    const root = document.documentElement;
    root.dataset.printDensity = density;
    return () => {
      delete root.dataset.printDensity;
    };
  }, [density]);
}
