import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";

let isSanitizeHookRegistered = false;

// A course's SVG can come from an upload today and, once peer import ships
// (docs/pear-integration-notes.md), from someone else's shared course —
// treat it as untrusted either way. This hook is registered once, lazily
// (not at module load, so importing this file in a DOM-less unit test
// doesn't touch DOMPurify's real-window-only API), globally on the shared
// DOMPurify instance: this component is the only place in the app that
// renders arbitrary markup inline, so a single hook is simpler than
// threading a scoped instance through. It strips `href`/`xlink:href` values
// that aren't a same-document fragment (`#...`) or a `data:` URI — closing
// off "phone home" references (e.g. `<image xlink:href="https://...">`)
// that DOMPurify's SVG profile allows through by default since they're not
// script-execution XSS on their own.
function ensureSanitizeHookRegistered() {
  if (isSanitizeHookRegistered) {
    return;
  }

  isSanitizeHookRegistered = true;

  DOMPurify.addHook("uponSanitizeAttribute", (_node, event) => {
    if (event.attrName !== "href" && event.attrName !== "xlink:href") {
      return;
    }

    if (!event.attrValue.startsWith("#") && !event.attrValue.startsWith("data:")) {
      event.keepAttr = false;
    }
  });
}

const SANITIZE_CONFIG = {
  FORBID_TAGS: ["script", "foreignObject", "style"],
  USE_PROFILES: { svg: true, svgFilters: true },
};

function findShapeId(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest("[id]")?.id ?? null;
}

export function RegionPickerCanvas({
  onToggleShape,
  selectedShapeIds,
  svgUrl,
}: {
  onToggleShape: (shapeId: string) => void;
  selectedShapeIds: string[];
  svgUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sanitizedMarkup, setSanitizedMarkup] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSanitizedMarkup(null);
    setLoadError(false);

    fetch(svgUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load SVG (${response.status})`);
        }

        return response.text();
      })
      .then((rawMarkup) => {
        if (!cancelled) {
          ensureSanitizeHookRegistered();
          setSanitizedMarkup(DOMPurify.sanitize(rawMarkup, SANITIZE_CONFIG));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [svgUrl]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const shapeId = findShapeId(event.target);

      if (shapeId) {
        onToggleShape(shapeId);
      }
    };

    container.addEventListener("click", handleClick);

    return () => {
      container.removeEventListener("click", handleClick);
    };
    // `sanitizedMarkup` is a real dependency, not just data the effect reads:
    // the container div (and therefore `containerRef.current`) doesn't exist
    // in the DOM until markup has loaded (see the early `null` render below),
    // so this effect must re-run once it does — depending on `onToggleShape`
    // alone would leave the very first successful load's container without a
    // listener, since that identity didn't change between this render and
    // the initial one that found no container.
  }, [onToggleShape, sanitizedMarkup]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const selectedIds = new Set(selectedShapeIds);

    for (const element of container.querySelectorAll("[id]")) {
      if (selectedIds.has(element.id)) {
        element.setAttribute("data-region-selected", "true");
      } else {
        element.removeAttribute("data-region-selected");
      }
    }
  }, [selectedShapeIds, sanitizedMarkup]);

  if (loadError) {
    return <p className="text-sm text-destructive">Couldn't load this diagram.</p>;
  }

  if (sanitizedMarkup === null) {
    return <p className="text-sm text-muted-foreground">Loading diagram…</p>;
  }

  return (
    <>
      <style>{`
        [data-region-picker-canvas] svg { display: block; width: 100%; height: auto; }
        [data-region-picker-canvas] [id] { cursor: pointer; }
        /* !important: a shape commonly sets its own fill via an inline
           style="fill:...", which otherwise always outranks a stylesheet
           rule regardless of selector specificity. */
        [data-region-picker-canvas] [id][data-region-selected="true"] {
          fill: var(--primary) !important;
          opacity: 0.65;
        }
      `}</style>
      <div
        data-region-picker-canvas=""
        dangerouslySetInnerHTML={{ __html: sanitizedMarkup }}
        ref={containerRef}
      />
    </>
  );
}
