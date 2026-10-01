import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const queryKey = ["preferences", "showBundledCourses"] as const;

// Whether the bundled courses (Getting Started) appear on Home and in
// recently viewed. Hiding them is a view choice: the files stay on disk, so
// turning it back on shows them again at once. On by default.
export function useShowBundledCourses(): [boolean, (show: boolean) => void] {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey,
    queryFn: async () => (await window.preferences.get()).showBundledCourses !== false,
  });

  const setShow = useCallback(
    (show: boolean) => {
      queryClient.setQueryData(queryKey, show);
      void window.preferences.set({ showBundledCourses: show });
    },
    [queryClient],
  );

  return [data ?? true, setShow];
}
