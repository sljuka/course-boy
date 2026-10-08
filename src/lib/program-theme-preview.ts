import { createContext, useContext, useEffect } from "react";

import type { ProgramTheme } from "@/lib/program-package";

// The program editor's unsaved theme, for ProgramThemeScope's live preview.
export const ProgramThemePreviewContext = createContext<(theme: ProgramTheme | null) => void>(() => {});

// Shows `theme` app-wide while the calling component (the editor) is open.
export function useProgramThemePreview(theme: ProgramTheme | null) {
  const setPreview = useContext(ProgramThemePreviewContext);
  useEffect(() => {
    setPreview(theme);
  }, [setPreview, theme]);
  useEffect(() => () => setPreview(null), [setPreview]);
}
