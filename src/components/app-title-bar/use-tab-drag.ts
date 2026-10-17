import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useState } from "react";

// How far the pointer moves before a press on a tab becomes a drag; less is
// a click, which just selects it.
const DRAG_THRESHOLD_PX = 5;

type Drag = {
  // Where the dragged tab started and where it would land now.
  from: number;
  to: number;
  id: string;
  // How far the dragged tab has moved, kept within the strip.
  dx: number;
  // How far the others slide to make room: the dragged tab's width plus the gap.
  shift: number;
};

// Reordering the title bar's tabs by dragging (SLJ-148). A press moves the
// tab once the pointer has gone a few pixels; it stays within the tab strip
// (never moving the window, never torn off), the others slide aside as it
// passes them, and releasing drops it there (`onDrop` with its new index).
export function useTabDrag(stripRef: RefObject<HTMLElement | null>, onDrop: (id: string, toIndex: number) => void) {
  const [drag, setDrag] = useState<Drag | null>(null);
  // Right after a drop, for one frame: the tabs are in their new order with
  // no transition, the dropped one still where the pointer left it (relative
  // to its new place). Then it slides the rest of the way. Without this the
  // reorder and the offsets resetting would animate together: the dropped
  // tab yanked a slot over before sliding back.
  const [settling, setSettling] = useState<{ id: string; offset: number } | null>(null);

  useEffect(() => {
    if (!settling) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setSettling(null));
    });
    return () => cancelAnimationFrame(frame);
  }, [settling]);

  function onPointerDown(event: ReactPointerEvent, id: string, from: number) {
    const strip = stripRef.current;
    if (event.button !== 0 || !strip) return;
    const rects = [...strip.querySelectorAll('[data-slot="window-title-bar-tab"]')].map((tab) =>
      tab.getBoundingClientRect(),
    );
    const own = rects[from];
    if (!own) return;
    const gap = rects.length > 1 ? rects[1].left - rects[0].right : 0;
    const startX = event.clientX;
    let current: Drag | null = null;

    function move(moveEvent: PointerEvent) {
      const dx = moveEvent.clientX - startX;
      if (!current && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      // Within the strip: from the first tab's left edge to the last one's right.
      const clamped = Math.min(Math.max(dx, rects[0].left - own.left), rects[rects.length - 1].right - own.right);
      // It takes a neighbour's place once its leading edge passes that
      // neighbour's middle, like a browser's tabs: its right edge for tabs
      // after it, its left edge for tabs before it.
      const left = own.left + clamped;
      const right = own.right + clamped;
      const to = rects.filter((rect, index) => {
        const middle = rect.left + rect.width / 2;
        if (index < from) return left >= middle;
        if (index > from) return right > middle;
        return false;
      }).length;
      current = { dx: clamped, from, id, shift: own.width + gap, to };
      setDrag(current);
    }

    function end() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (current && current.to !== current.from) {
        setSettling({ id: current.id, offset: current.dx - (current.to - current.from) * current.shift });
        onDrop(current.id, current.to);
      }
      setDrag(null);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  // How far the tab at `index` is moved while a drag is on, in pixels.
  function offsetOf(index: number, id: string): number {
    if (settling) return settling.id === id ? settling.offset : 0;
    if (!drag) return 0;
    if (index === drag.from) return drag.dx;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -drag.shift;
    if (drag.from > drag.to && index >= drag.to && index < drag.from) return drag.shift;
    return 0;
  }

  return { draggedId: drag?.id ?? null, isSettling: settling !== null, offsetOf, onPointerDown };
}
