import { useQuery } from "@tanstack/react-query";

import type { CourseDetails, CourseSummary } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";

export function useCoursesQuery(
  locale: Locale,
  options: { throwOnError?: boolean } = {},
) {
  return useQuery<CourseSummary[]>({
    queryKey: ["courses", "list", locale],
    queryFn: () => window.courses.list(locale),
    throwOnError: options.throwOnError,
  });
}

export function useCourseDetailsQuery(
  courseId: string | undefined,
  locale: Locale,
  options: { throwOnError?: boolean } = {},
) {
  return useQuery<CourseDetails | null>({
    enabled: Boolean(courseId),
    queryKey: ["courses", "detail", courseId, locale],
    queryFn: () => window.courses.get(courseId!, locale),
    throwOnError: options.throwOnError,
  });
}
