import { useEffect, useState, type ReactNode } from "react";
import { matchPath, useLocation } from "react-router-dom";

import type { ProgramTheme } from "@/lib/program-package";
import { useProgramQuery } from "@/lib/program-queries";
import { resolveProgramTheme } from "@/lib/program-theme";
import { ProgramThemePreviewContext } from "@/lib/program-theme-preview";
import { useProgramThemesPreference } from "@/lib/program-themes-preference";
import { useAppState } from "@/lib/use-app-state";

// Recolors the whole window with a program's theme (SLJ-32) while the reader
// is on the program's page or in one of its courses (its page, lessons and
// tests), and with the editor's unsaved theme while a teacher edits one (a
// live preview). The same for a channel (SLJ-31): its page, and My channel. Leaving puts the app's own colors back. Off entirely when
// Settings → Interface → "Use program colors" is off.
//
// The program stays "active" from its page into its courses: a course that
// isn't in it (opened from Home, say) ends it.
export function ProgramThemeScope({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<ProgramTheme | null>(null);
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const { pathname } = useLocation();
  const { theme: appMode } = useAppState();
  const [enabled] = useProgramThemesPreference();
  const { data: activeProgram } = useProgramQuery(activeProgramId ?? undefined);

  // A channel (SLJ-31) is a program underneath: its page and My channel too.
  const programPage =
    matchPath("/programs/:programId", pathname)?.params.programId ??
    matchPath("/channels/:programId", pathname)?.params.programId;
  const courseId = matchPath("/courses/:courseId/*", pathname)?.params.courseId;
  const isEditor = Boolean(matchPath("/my-programs/:programId", pathname) || matchPath("/my-channel", pathname));

  useEffect(() => {
    if (programPage) {
      setActiveProgramId(programPage);
    } else if (!courseId || (activeProgram && !activeProgram.courses.some((course) => course.courseId === courseId))) {
      setActiveProgramId(null);
    }
  }, [activeProgram, courseId, programPage]);

  const inProgram =
    activeProgram &&
    (programPage === activeProgram.id ||
      (courseId !== undefined && activeProgram.courses.some((course) => course.courseId === courseId)));
  const theme = isEditor ? preview : inProgram ? activeProgram.theme : null;

  useEffect(() => {
    const resolved = enabled && theme ? resolveProgramTheme(theme) : null;
    if (!resolved) return;

    const root = document.documentElement;
    // After this commit's other effects (the app's own theme effect sets the
    // dark class too, and runs after this one when the mode changes).
    queueMicrotask(() => {
      for (const [name, value] of Object.entries(resolved.variables)) root.style.setProperty(name, value);
      root.classList.toggle("dark", resolved.isDark);
      root.dataset.programTheme = "on";
    });
    return () => {
      for (const name of Object.keys(resolved.variables)) root.style.removeProperty(name);
      root.classList.toggle("dark", appMode === "dark");
      delete root.dataset.programTheme;
    };
  }, [appMode, enabled, theme]);

  return <ProgramThemePreviewContext.Provider value={setPreview}>{children}</ProgramThemePreviewContext.Provider>;
}
