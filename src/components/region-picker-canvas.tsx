import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";

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

// How far zoom-in can shrink the native viewBox — can't zoom out past 1
// (the native, full-diagram extent).
const MIN_ZOOM_FRACTION = 0.02;
const ZOOM_STEP_FACTOR = 1.3;

type ViewBoxBox = { height: number; width: number; x: number; y: number };

function findShapeId(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest("[id]")?.id ?? null;
}

function parseViewBox(value: string | null | undefined): ViewBoxBox | null {
  if (!value) {
    return null;
  }

  const parts = value.trim().split(/\s+/).map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [x, y, width, height] = parts;

  return { height, width, x, y };
}

function formatViewBox(box: ViewBoxBox): string {
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isFiniteBox(box: ViewBoxBox): boolean {
  return (
    Number.isFinite(box.x) &&
    Number.isFinite(box.y) &&
    Number.isFinite(box.width) &&
    Number.isFinite(box.height) &&
    box.width > 0 &&
    box.height > 0
  );
}

export function RegionPickerCanvas({
  isAdjustingView = false,
  onSelectedShapesOutOfView,
  onToggleShape,
  onViewBoxChange,
  selectedShapeIds = [],
  shapeColors,
  svgUrl,
  viewBox,
}: {
  isAdjustingView?: boolean;
  onSelectedShapesOutOfView?: (updater: (current: string[]) => string[]) => void;
  onToggleShape: (shapeId: string) => void;
  onViewBoxChange?: (viewBox: string) => void;
  // The boolean "is this shape marked" highlight region-picker uses.
  selectedShapeIds?: string[];
  // A per-shape arbitrary fill color (shape id -> hex) — region-marker uses
  // this instead of `selectedShapeIds` since each of its regions needs its
  // own distinct color rather than one shared highlight. The two are
  // independent: a kind only ever passes one of them.
  shapeColors?: Record<string, string>;
  svgUrl: string;
  // A teacher-chosen crop; `undefined` shows the file's own native viewBox.
  viewBox?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousShapeColorIdsRef = useRef<Set<string>>(new Set());
  // A shape's original `fill` (its own author-set color, read once before we
  // ever override it) — see the effect below for why this can't just be
  // `removeProperty`d back.
  const originalFillByIdRef = useRef<Map<string, string>>(new Map());
  const viewBoxRef = useRef(viewBox);
  const [sanitizedMarkup, setSanitizedMarkup] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  // The file's own viewBox, read once per file — the coordinate system every
  // crop is expressed in. State (not a ref) because the crop transform below
  // is derived from it during render.
  const [nativeBox, setNativeBox] = useState<ViewBoxBox | null>(null);
  const nativeBoxRef = useRef<ViewBoxBox | null>(null);
  // `dangerouslySetInnerHTML` must be a stable object: React's DOM diffing
  // compares this prop by reference, not by drilling into `.__html`. A fresh
  // `{ __html: sanitizedMarkup }` literal in the JSX below — the obvious way
  // to write it — would be a "new" value on every render of this component
  // for any reason at all (a keystroke in the exercise's prompt field, a
  // parent re-render, anything), and React would re-run `element.innerHTML =
  // sanitizedMarkup` every time even though the string itself never changed.
  // That wipes out whatever the effects below have imperatively stamped onto
  // the parsed shapes (the `data-region-selected` highlight) on every
  // unrelated re-render — this was the actual cause of "the marked region
  // disappears," not anything specific to clicking or the crop feature.
  const dangerousHtml = useMemo(
    () => (sanitizedMarkup === null ? null : { __html: sanitizedMarkup }),
    [sanitizedMarkup],
  );

  viewBoxRef.current = viewBox;
  nativeBoxRef.current = nativeBox;

  // Every callback prop here is realistically a fresh inline closure on
  // every parent render (`onChange={(u) => onExerciseChange(id, u)}` and
  // friends). Reading them through refs — updated on every render, but
  // never themselves an effect dependency — means the effects below only
  // re-run (tearing down and re-attaching native listeners) when something
  // that actually requires re-binding changes, never on an unrelated parent
  // re-render. This matters most for the pan effect below: without it, a
  // real drag gesture's own `onViewBoxChange` calls would each trigger a
  // re-render that tears down and re-attaches `pointermove`/pointer-capture
  // mid-gesture, which reproduced as a hard crash during testing.
  const onToggleShapeRef = useRef(onToggleShape);
  const onViewBoxChangeRef = useRef(onViewBoxChange);
  const onSelectedShapesOutOfViewRef = useRef(onSelectedShapesOutOfView);
  onToggleShapeRef.current = onToggleShape;
  onViewBoxChangeRef.current = onViewBoxChange;
  onSelectedShapesOutOfViewRef.current = onSelectedShapesOutOfView;

  useEffect(() => {
    let cancelled = false;
    setSanitizedMarkup(null);
    setLoadError(false);
    setNativeBox(null);
    // A new file means new elements — any cached "original fill" belonged to
    // the previous document's DOM and would otherwise wrongly restore onto a
    // same-id shape in a completely different file.
    previousShapeColorIdsRef.current = new Set();
    originalFillByIdRef.current = new Map();

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

  // Read the file's own viewBox once markup has loaded — this is the only
  // place that touches the raw <svg>, and only to read it. The crop itself
  // is never written onto that element directly: it's expressed as a CSS
  // `transform` on the wrapper div below, a plain React-owned style prop
  // that React reapplies on every render like any other prop.
  useEffect(() => {
    if (nativeBoxRef.current !== null) {
      return;
    }

    const svg = containerRef.current?.querySelector("svg");
    const parsed = parseViewBox(svg?.getAttribute("viewBox"));

    if (parsed) {
      setNativeBox(parsed);
    }
  }, [sanitizedMarkup]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || isAdjustingView) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const shapeId = findShapeId(event.target);

      if (shapeId) {
        onToggleShapeRef.current(shapeId);
      }
    };

    container.addEventListener("click", handleClick);

    return () => {
      container.removeEventListener("click", handleClick);
    };
    // `sanitizedMarkup` is a real dependency, not just data the effect reads:
    // the container div (and therefore `containerRef.current`) doesn't exist
    // in the DOM until markup has loaded (see the early `null` render below),
    // so this effect must re-run once it does.
  }, [isAdjustingView, sanitizedMarkup]);

  // Drag-to-pan, active only while adjusting the view. Zooming is handled by
  // the explicit buttons below instead of scroll/wheel — a real wheel event
  // fired by a trackpad or mouse is indistinguishable from the page's own
  // scroll gesture, which made this unreliable to both use and test. Reads
  // the latest viewBox from `viewBoxRef` (updated every render, above)
  // rather than depending on `viewBox` directly, so this effect doesn't tear
  // down and re-attach its listeners on every single pan step (each of which
  // changes `viewBox` via the parent). Still reads the rendered element's own
  // size via `getBoundingClientRect` — purely to interpret pointer-movement
  // pixels as a fraction of the crop, never to write anything back onto it.
  useEffect(() => {
    const container = containerRef.current;

    if (!container || !isAdjustingView || !onViewBoxChangeRef.current) {
      return;
    }

    let dragPointerId: number | null = null;
    let dragStartClientX = 0;
    let dragStartClientY = 0;
    let dragStartBox: ViewBoxBox | null = null;

    function getEffectiveBox(): ViewBoxBox | null {
      return parseViewBox(viewBoxRef.current) ?? nativeBoxRef.current;
    }

    function handlePointerDown(event: PointerEvent) {
      const box = getEffectiveBox();

      if (!box) {
        return;
      }

      dragPointerId = event.pointerId;
      dragStartClientX = event.clientX;
      dragStartClientY = event.clientY;
      dragStartBox = box;

      try {
        container!.setPointerCapture(event.pointerId);
      } catch {
        // Capture is a best-effort affordance (keeps the drag going if the
        // cursor leaves the canvas mid-gesture) — panning itself doesn't
        // depend on it, so a rejected/invalid pointer id here shouldn't
        // abort the gesture.
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (dragPointerId !== event.pointerId || !dragStartBox) {
        return;
      }

      const rect = container!.getBoundingClientRect();

      // A momentarily zero-size rect (mid-layout, or the window resizing)
      // would otherwise divide-by-zero into NaN and permanently corrupt the
      // saved viewBox — bail out and wait for the next move instead.
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      const dx = ((event.clientX - dragStartClientX) / rect.width) * dragStartBox.width;
      const dy = ((event.clientY - dragStartClientY) / rect.height) * dragStartBox.height;
      const nextBox = {
        height: dragStartBox.height,
        width: dragStartBox.width,
        x: dragStartBox.x - dx,
        y: dragStartBox.y - dy,
      };

      if (isFiniteBox(nextBox)) {
        onViewBoxChangeRef.current!(formatViewBox(nextBox));
      }
    }

    function handlePointerUp(event: PointerEvent) {
      if (dragPointerId === event.pointerId) {
        try {
          container!.releasePointerCapture(event.pointerId);
        } catch {
          // See the matching try/catch in handlePointerDown.
        }

        dragPointerId = null;
        dragStartBox = null;
      }
    }

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointercancel", handlePointerUp);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isAdjustingView, sanitizedMarkup]);

  // Zoom in/out around the center of the current view — used by the
  // "Zoom in" / "Zoom out" buttons below. Pure arithmetic on the current and
  // native boxes; no DOM measurement needed, unlike panning.
  function zoomBy(factor: number) {
    const onViewBoxChange = onViewBoxChangeRef.current;
    const nativeBoxValue = nativeBoxRef.current;
    const box = parseViewBox(viewBoxRef.current) ?? nativeBoxValue;

    if (!onViewBoxChange || !box || !nativeBoxValue) {
      return;
    }

    const minWidth = nativeBoxValue.width * MIN_ZOOM_FRACTION;
    const minHeight = nativeBoxValue.height * MIN_ZOOM_FRACTION;
    const nextWidth = clamp(box.width * factor, minWidth, nativeBoxValue.width);
    const nextHeight = clamp(box.height * factor, minHeight, nativeBoxValue.height);
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const nextBox = {
      height: nextHeight,
      width: nextWidth,
      x: centerX - nextWidth / 2,
      y: centerY - nextHeight / 2,
    };

    if (isFiniteBox(nextBox)) {
      onViewBoxChange(formatViewBox(nextBox));
    }
  }

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

  // `shapeColors` is a separate, independent highlight mechanism from
  // `selectedShapeIds` above (see its prop doc). Unlike that effect, this one
  // must NOT blindly touch every `[id]` element: many of this SVG's shapes
  // set their own natural color via an inline `style="fill:..."` (not the
  // `fill="..."` attribute), and clearing every unlisted element's inline
  // style would wipe that out, leaving the shape black (its DOM-default
  // fill). So this only ever writes to, and later clears, shapes that were
  // themselves once a `shapeColors` key — tracked across renders in
  // `previousShapeColorIdsRef` — never any other shape in the file.
  //
  // Clearing isn't a plain `removeProperty` either: `element.style` is the
  // live CSSOM view of the inline `style` attribute, so the first
  // `setProperty("fill", ...)` below overwrites — and permanently loses — a
  // shape's own original color, the same one `removeProperty` would need to
  // bring back. `originalFillByIdRef` snapshots that value the first time a
  // shape is colored, so unmarking it (cycling back to "none") restores the
  // real original instead of leaving no fill at all, which SVG renders as
  // solid black.
  useEffect(() => {
    const container = containerRef.current;

    if (!container || !shapeColors) {
      return;
    }

    const currentIds = new Set(Object.keys(shapeColors));

    for (const id of previousShapeColorIdsRef.current) {
      if (currentIds.has(id)) {
        continue;
      }

      const element = container.querySelector(`[id="${CSS.escape(id)}"]`);

      if (element instanceof SVGElement) {
        const originalFill = originalFillByIdRef.current.get(id);

        if (originalFill) {
          element.style.setProperty("fill", originalFill);
        } else {
          element.style.removeProperty("fill");
        }
      }
    }

    for (const [id, color] of Object.entries(shapeColors)) {
      const element = container.querySelector(`[id="${CSS.escape(id)}"]`);

      if (element instanceof SVGElement) {
        if (!originalFillByIdRef.current.has(id)) {
          originalFillByIdRef.current.set(id, element.style.getPropertyValue("fill"));
        }

        element.style.setProperty("fill", color, "important");
      }
    }

    previousShapeColorIdsRef.current = currentIds;
  }, [shapeColors, sanitizedMarkup]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !onSelectedShapesOutOfViewRef.current) {
      return;
    }

    // Screen-space comparison (not `getBBox()`, which is relative to an
    // element's own local coordinate system and would be wrong under a
    // transformed ancestor `<g>`) so this is correct regardless of how the
    // diagram is structured internally, or how the crop above is applied —
    // it directly answers "is this shape currently visible in the cropped
    // view," the same question a student looking at the screen is asking.
    // Split into its own effect (rather than sharing the highlight-stamping
    // one above) so this — the more speculative, DOM-measurement-heavy piece
    // — can never interfere with the core toggle/highlight behavior even if
    // something here is slow or throws.
    try {
      const containerRect = container.getBoundingClientRect();
      const outOfViewIds = selectedShapeIds.filter((id) => {
        const element = container.querySelector(`[id="${CSS.escape(id)}"]`);

        if (!element) {
          return false;
        }

        const rect = element.getBoundingClientRect();

        return (
          rect.right <= containerRect.left ||
          rect.left >= containerRect.right ||
          rect.bottom <= containerRect.top ||
          rect.top >= containerRect.bottom
        );
      });

      onSelectedShapesOutOfViewRef.current((current) => {
        if (
          current.length === outOfViewIds.length &&
          current.every((id, index) => id === outOfViewIds[index])
        ) {
          return current;
        }

        return outOfViewIds;
      });
    } catch {
      // Best-effort warning only — never let a measurement failure here
      // affect the exercise itself.
    }
  }, [selectedShapeIds, sanitizedMarkup, viewBox]);

  if (loadError) {
    return <p className="text-sm text-destructive">Couldn't load this diagram.</p>;
  }

  if (sanitizedMarkup === null) {
    return <p className="text-sm text-muted-foreground">Loading diagram…</p>;
  }

  const effectiveBox = parseViewBox(viewBox) ?? nativeBox;
  const cropStyle =
    nativeBox && effectiveBox
      ? {
          transform:
            `scale(${nativeBox.width / effectiveBox.width}, ${nativeBox.height / effectiveBox.height}) ` +
            `translate(${(-effectiveBox.x / nativeBox.width) * 100}%, ${(-effectiveBox.y / nativeBox.height) * 100}%)`,
          transformOrigin: "0 0",
        }
      : undefined;

  return (
    <>
      <style>{`
        [data-region-picker-canvas] svg { display: block; width: 100%; height: auto; }
        [data-region-picker-canvas] [id] { cursor: pointer; }
        [data-region-picker-canvas][data-adjusting-view="true"] { cursor: grab; touch-action: none; }
        [data-region-picker-canvas][data-adjusting-view="true"] [id] { cursor: grab; }
        /* !important: a shape commonly sets its own fill via an inline
           style="fill:...", which otherwise always outranks a stylesheet
           rule regardless of selector specificity. */
        [data-region-picker-canvas] [id][data-region-selected="true"] {
          fill: var(--primary) !important;
          opacity: 0.65;
        }
      `}</style>
      <div className="relative overflow-hidden">
        <div
          data-adjusting-view={isAdjustingView}
          data-region-picker-canvas=""
          dangerouslySetInnerHTML={dangerousHtml ?? undefined}
          ref={containerRef}
          style={cropStyle}
        />
        {isAdjustingView && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button
              aria-label="Zoom in"
              onClick={() => zoomBy(1 / ZOOM_STEP_FACTOR)}
              size="icon"
              type="button"
              variant="secondary"
            >
              <ZoomIn aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Zoom out"
              onClick={() => zoomBy(ZOOM_STEP_FACTOR)}
              size="icon"
              type="button"
              variant="secondary"
            >
              <ZoomOut aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
