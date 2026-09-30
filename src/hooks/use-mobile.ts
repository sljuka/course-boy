import * as React from "react"

// Window widths below which parts of the frame turn into drawers (closed
// until opened from their toggle), so the page keeps its width. See
// docs/contracts.md §9.
const MOBILE_BREAKPOINT = 768
// The editor's side panels (Explorer, Versions). Keep in sync with the
// `compact` variant in src/index.css (text buttons turn icon-only there).
export const SIDE_PANELS_INLINE_MIN_WIDTH = 1280
// The app sidebar, later than the panels: mid-size windows keep it inline.
export const APP_SIDEBAR_INLINE_MIN_WIDTH = 1024

function useIsNarrowerThan(width: number) {
  const [isNarrower, setIsNarrower] = React.useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth < width
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${width - 1}px)`)
    const onChange = () => setIsNarrower(window.innerWidth < width)
    mql.addEventListener("change", onChange)
    onChange()
    return () => mql.removeEventListener("change", onChange)
  }, [width])

  return isNarrower
}

export function useIsMobile() {
  return useIsNarrowerThan(MOBILE_BREAKPOINT)
}

// Explorer / Versions render as drawers below this width.
export function useIsCompactSidePanels() {
  return useIsNarrowerThan(SIDE_PANELS_INLINE_MIN_WIDTH)
}

// The app sidebar renders as a drawer below this width.
export function useIsCompactAppSidebar() {
  return useIsNarrowerThan(APP_SIDEBAR_INLINE_MIN_WIDTH)
}
