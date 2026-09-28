import { useState } from "react";
import { NavigationType, useLocation, useNavigationType } from "react-router-dom";

// Whether the title bar's Back/Forward buttons have somewhere to go.
//
// The browser doesn't expose "can go back/forward" to a page, but React Router
// stores a monotonically increasing `idx` in every history entry it creates
// (`window.history.state.idx`, 0 for the first entry). So back is possible
// whenever `idx > 0`, and forward whenever we have seen a higher `idx` that a
// later PUSH hasn't discarded — a push truncates the forward stack, exactly
// like the browser does. A window reload resets the known forward range; the
// buttons then just start conservative.

export type HistoryPosition = { index: number; maxIndex: number };

export function nextHistoryPosition(
  previous: HistoryPosition,
  index: number,
  navigationType: NavigationType,
): HistoryPosition {
  if (navigationType === NavigationType.Push) {
    return { index, maxIndex: index };
  }

  return { index, maxIndex: Math.max(previous.maxIndex, index) };
}

function readHistoryIndex(): number {
  const state = window.history.state as { idx?: unknown } | null;

  return typeof state?.idx === "number" ? state.idx : 0;
}

export function useHistoryAvailability(): { canGoBack: boolean; canGoForward: boolean } {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [tracked, setTracked] = useState(() => {
    const index = readHistoryIndex();

    return { key: location.key, position: { index, maxIndex: index } };
  });

  // Recomputed during render when the location changes (React's "adjust state
  // on prop change" pattern), so the buttons never lag a frame behind.
  let position = tracked.position;

  if (tracked.key !== location.key) {
    position = nextHistoryPosition(tracked.position, readHistoryIndex(), navigationType);
    setTracked({ key: location.key, position });
  }

  return {
    canGoBack: position.index > 0,
    canGoForward: position.index < position.maxIndex,
  };
}
