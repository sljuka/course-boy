import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useCourseDetailsQuery } from "@/lib/course-queries";
import { parseMnemonics, type CourseMnemonic } from "@/lib/mnemonics";
import { useAppState } from "@/lib/use-app-state";

const queryKey = ["preferences", "showMnemonics"] as const;

// The student's choice to see course mnemonics (SLJ-37), across all courses.
// On by default; toggled from the player.
export function useShowMnemonics(): [boolean, (show: boolean) => void] {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey,
    queryFn: async () => (await window.preferences.get()).showMnemonics !== false,
  });

  const setShow = useCallback(
    (show: boolean) => {
      queryClient.setQueryData(queryKey, show);
      void window.preferences.set({ showMnemonics: show });
    },
    [queryClient],
  );

  return [data ?? true, setShow];
}

// A course's mnemonics in the language its lessons are shown in: the app's,
// when the course has it, else the course's default. `all` ignores the
// student's on/off choice (to know whether there's anything to toggle).
export function useCourseMnemonics(courseId: string | undefined): {
  all: CourseMnemonic[];
  shown: CourseMnemonic[];
} {
  const { locale } = useAppState();
  const { data: course } = useCourseDetailsQuery(courseId, locale);
  const [show] = useShowMnemonics();

  return useMemo(() => {
    if (!course) {
      return { all: [], shown: [] };
    }

    const lessonLocale = course.supportedLocales.includes(locale) ? locale : course.defaultLocale;
    const all = parseMnemonics(course.locales[lessonLocale]?.mnemonics);
    return { all, shown: show ? all : [] };
  }, [course, locale, show]);
}
