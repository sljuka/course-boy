import { useMutation, useQuery } from "@tanstack/react-query";

import type {
  CourseDetails,
  CourseSummary,
  CourseVersionHistory,
  CreateCourseDraftInput,
  CreateCourseDraftResult,
  CreateCourseLessonInput,
  CreateCourseLessonResult,
  CreateCourseSectionInput,
  CreateCourseSectionResult,
  CreateCourseSectionTestInput,
  CreateCourseSectionTestResult,
  CutCourseVersionInput,
  CutCourseVersionResult,
  GetLessonTestDraftInput,
  GetSectionTestDraftInput,
  PublishCourseVersionInput,
  RevertCourseDraftInput,
  SaveLessonTestInput,
  SaveSectionTestInput,
  SharedTestDefinition,
  UpdateLessonContentInput,
  UploadCourseAssetInput,
  UploadCourseAssetResult,
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

export function useCreateCourseSectionTestMutation() {
  return useMutation<CreateCourseSectionTestResult, Error, CreateCourseSectionTestInput>({
    mutationFn: (input) => window.courses.createSectionTest(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useSaveSectionTestMutation() {
  return useMutation<void, Error, SaveSectionTestInput>({
    mutationFn: (input) => window.courses.saveSectionTest(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useSectionTestDraftQuery(input: GetSectionTestDraftInput | null) {
  return useQuery<SharedTestDefinition | null>({
    enabled: input !== null,
    queryKey: ["courses", "section-test-draft", input?.courseId, input?.testId],
    queryFn: () => window.courses.getSectionTestDraft(input!),
  });
}

export function useUploadCourseAssetMutation() {
  return useMutation<UploadCourseAssetResult, Error, UploadCourseAssetInput>({
    mutationFn: (input) => window.courses.uploadAsset(input),
  });
}

export function useCourseVersionHistoryQuery(courseId: string | undefined) {
  return useQuery<CourseVersionHistory | null>({
    enabled: Boolean(courseId),
    queryKey: ["courses", "version-history", courseId],
    queryFn: () => window.courses.getVersionHistory(courseId!),
  });
}

export function useCutCourseVersionMutation() {
  return useMutation<CutCourseVersionResult, Error, CutCourseVersionInput>({
    mutationFn: (input) => window.courses.cutVersion(input),
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["courses", "detail", input.courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "version-history", input.courseId],
        }),
      ]);
    },
  });
}

export function useRevertCourseDraftMutation() {
  return useMutation<void, Error, RevertCourseDraftInput>({
    mutationFn: (input) => window.courses.revertToVersion(input),
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["courses", "detail", input.courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "version-history", input.courseId],
        }),
      ]);
    },
  });
}

export function usePublishCourseVersionMutation() {
  return useMutation<void, Error, PublishCourseVersionInput>({
    mutationFn: (input) => window.courses.publishVersion(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "version-history", input.courseId],
      });
    },
  });
}
