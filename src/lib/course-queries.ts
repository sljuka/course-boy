import { useMutation, useQuery } from "@tanstack/react-query";

import type {
  CourseDetails,
  CourseSummary,
  CreateCourseDraftInput,
  CreateCourseDraftResult,
  CreateCourseLessonInput,
  CreateCourseLessonResult,
  CreateCourseSectionInput,
  CreateCourseSectionResult,
  GetLessonTestDraftInput,
  SaveLessonTestInput,
  SharedTestDefinition,
  UpdateLessonContentInput,
} from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";

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

export function useRemoveCourseMutation() {
  return useMutation({
    mutationFn: (courseId: string) => window.courses.remove(courseId),
    onSuccess: async (_result, courseId) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses"],
      });
      queryClient.removeQueries({
        queryKey: ["courses", "detail", courseId],
      });
    },
  });
}

export function useCreateCourseDraftMutation() {
  return useMutation<CreateCourseDraftResult, Error, CreateCourseDraftInput>({
    mutationFn: (input) => window.courses.createDraft(input),
    onSuccess: async ({ courseId }) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses"],
      });
      queryClient.removeQueries({
        queryKey: ["courses", "detail", courseId],
      });
    },
  });
}

export function useCreateCourseSectionMutation() {
  return useMutation<CreateCourseSectionResult, Error, CreateCourseSectionInput>({
    mutationFn: (input) => window.courses.createSection(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useCreateCourseLessonMutation() {
  return useMutation<CreateCourseLessonResult, Error, CreateCourseLessonInput>({
    mutationFn: (input) => window.courses.createLesson(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useUpdateLessonContentMutation() {
  return useMutation<void, Error, UpdateLessonContentInput>({
    mutationFn: (input) => window.courses.updateLessonContent(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useSaveLessonTestMutation() {
  return useMutation<void, Error, SaveLessonTestInput>({
    mutationFn: (input) => window.courses.saveLessonTest(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useLessonTestDraftQuery(input: GetLessonTestDraftInput | null) {
  return useQuery<SharedTestDefinition | null>({
    enabled: input !== null,
    queryKey: ["courses", "lesson-test-draft", input?.courseId, input?.lessonId],
    queryFn: () => window.courses.getLessonTestDraft(input!),
  });
}
