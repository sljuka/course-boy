import { useMutation, useQueries, useQuery } from "@tanstack/react-query";

import type {
  ApplyCourseSvgPresetInput,
  ApplyCourseSvgPresetResult,
  CourseDetails,
  CourseDiskUsage,
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
  DraftChangesPreview,
  UnusedDraftAsset,
  DeleteCourseLessonInput,
  DeleteCourseSectionInput,
  DeleteCourseSectionTestInput,
  GetLessonTestDraftInput,
  GetSectionTestDraftInput,
  PublishCourseVersionInput,
  RevertCourseDraftInput,
  SaveLessonTestInput,
  SaveSectionTestInput,
  SharedTestDefinition,
  UpdateCourseDraftMetadataInput,
  UpdateCourseSectionInput,
  UpdateCourseSectionTestMetadataInput,
  UpdateLessonContentInput,
  UpdateSectionIntroInput,
  RemoveSectionIntroInput,
  UploadCourseAssetBytesInput,
  UploadCourseAssetBytesResult,
  UploadCourseAssetInput,
  UploadCourseAssetResult,
} from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";

// Shared by every mutation that autosaves one draft entity's content (course
// metadata, a section, a document, a test) — never anything else (course
// creation/deletion, version cutting, asset uploads, ...). A single
// `useIsMutating({ mutationKey: courseContentSaveMutationKey })` call is what
// drives the draft editor's whole "Saving… / All changes saved" status bar,
// so every entity's own save must tag itself with this same key to be seen.
export const courseContentSaveMutationKey = ["courses", "save"] as const;

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

// The same course-details query as `useCourseDetailsQuery`, once per locale —
// for editors that need every language's content up front (the lesson document
// editor seeds each language tab from its own saved body).
export function useCourseDetailsForLocalesQueries(
  courseId: string | undefined,
  locales: readonly Locale[],
) {
  return useQueries({
    queries: locales.map((locale) => ({
      enabled: Boolean(courseId),
      queryKey: ["courses", "detail", courseId, locale],
      queryFn: () => window.courses.get(courseId!, locale),
    })),
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

export function useUpdateSectionMutation() {
  return useMutation<void, Error, UpdateCourseSectionInput>({
    mutationFn: (input) => window.courses.updateSection(input),
    mutationKey: courseContentSaveMutationKey,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useUpdateSectionTestMetadataMutation() {
  return useMutation<void, Error, UpdateCourseSectionTestMetadataInput>({
    mutationFn: (input) => window.courses.updateSectionTestMetadata(input),
    mutationKey: courseContentSaveMutationKey,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useUpdateDraftMetadataMutation() {
  return useMutation<void, Error, UpdateCourseDraftMetadataInput>({
    mutationFn: (input) => window.courses.updateDraftMetadata(input),
    mutationKey: courseContentSaveMutationKey,
    onSuccess: async (_result, input) => {
      // Also refreshes "My courses" — a title/description/rating edit here
      // is visible there too.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["courses", "list"] }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "detail", input.courseId],
        }),
      ]);
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
    mutationKey: courseContentSaveMutationKey,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useUpdateSectionIntroMutation() {
  return useMutation<void, Error, UpdateSectionIntroInput>({
    mutationFn: (input) => window.courses.updateSectionIntro(input),
    mutationKey: courseContentSaveMutationKey,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ["courses", "detail", input.courseId] });
    },
  });
}

export function useRemoveSectionIntroMutation() {
  return useMutation<void, Error, RemoveSectionIntroInput>({
    mutationFn: (input) => window.courses.removeSectionIntro(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ["courses", "detail", input.courseId] });
    },
  });
}

export function useSaveLessonTestMutation() {
  return useMutation<void, Error, SaveLessonTestInput>({
    mutationFn: (input) => window.courses.saveLessonTest(input),
    mutationKey: courseContentSaveMutationKey,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
      // `input.test` is exactly what `updateLocalCourseLessonTest` just wrote
      // to disk (see its own JSON.stringify(input.test)) — write it straight
      // into the cache instead of invalidating. Invalidating would refetch
      // from disk for data we already have, which flips this query's
      // `isFetching` true and (via `DraftTestEditor`'s loading gate) blanks
      // and remounts the whole editor after every single edit.
      queryClient.setQueryData(
        ["courses", "lesson-test-draft", input.courseId, input.lessonId],
        input.test,
      );
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
    mutationKey: courseContentSaveMutationKey,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
      // See the matching comment in useSaveLessonTestMutation — `input.test`
      // is exactly the content `updateLocalCourseSectionTest` just persisted
      // (it preserves identity/locales and spreads `input.test` verbatim),
      // so writing it directly into the cache avoids an unnecessary disk
      // refetch on every save.
      queryClient.setQueryData(
        ["courses", "section-test-draft", input.courseId, input.testId],
        input.test,
      );
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

export function useDeleteCourseSectionMutation() {
  return useMutation<void, Error, DeleteCourseSectionInput>({
    mutationFn: (input) => window.courses.deleteSection(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useDeleteCourseLessonMutation() {
  return useMutation<void, Error, DeleteCourseLessonInput>({
    mutationFn: (input) => window.courses.deleteLesson(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useDeleteCourseSectionTestMutation() {
  return useMutation<void, Error, DeleteCourseSectionTestInput>({
    mutationFn: (input) => window.courses.deleteSectionTest(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "detail", input.courseId],
      });
    },
  });
}

export function useUploadCourseAssetMutation() {
  return useMutation<UploadCourseAssetResult, Error, UploadCourseAssetInput>({
    mutationFn: (input) => window.courses.uploadAsset(input),
  });
}

export function useUploadCourseAssetBytesMutation() {
  return useMutation<UploadCourseAssetBytesResult, Error, UploadCourseAssetBytesInput>({
    mutationFn: (input) => window.courses.uploadAssetBytes(input),
  });
}

export function useApplySvgPresetMutation() {
  return useMutation<ApplyCourseSvgPresetResult, Error, ApplyCourseSvgPresetInput>({
    mutationFn: (input) => window.courses.applySvgPreset(input),
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
        // My courses shows each course's version, published version and cut date.
        queryClient.invalidateQueries({ queryKey: ["courses", "list"] }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "detail", input.courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "version-history", input.courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "unused-draft-assets", input.courseId],
        }),
      ]);
    },
  });
}

// The draft's unused assets — what the next cut will remove. Always refetched
// when the cut dialog opens (`enabled` flips on) since any lesson edit can
// change it.
// What committing the draft now would record (release notes) and any files its
// content refers to that are missing; fetched fresh each time the dialog opens.
export function useDraftChangesPreviewQuery(courseId: string, enabled: boolean) {
  return useQuery<DraftChangesPreview>({
    enabled,
    queryKey: ["courses", "draft-changes", courseId],
    queryFn: () => window.courses.previewDraftChanges(courseId),
    refetchOnMount: "always",
  });
}

export function useUnusedDraftAssetsQuery(courseId: string, enabled: boolean) {
  return useQuery<UnusedDraftAsset[]>({
    enabled,
    queryKey: ["courses", "unused-draft-assets", courseId],
    queryFn: () => window.courses.getUnusedDraftAssets(courseId),
    refetchOnMount: "always",
  });
}

export function useRevertCourseDraftMutation() {
  return useMutation<void, Error, RevertCourseDraftInput>({
    mutationFn: (input) => window.courses.revertToVersion(input),
    onSuccess: async (_result, input) => {
      await Promise.all([
        // My courses shows each course's version, published version and cut date.
        queryClient.invalidateQueries({ queryKey: ["courses", "list"] }),
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
      await Promise.all([
        // My courses shows each course's version, published version and cut date.
        queryClient.invalidateQueries({ queryKey: ["courses", "list"] }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "detail", input.courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "version-history", input.courseId],
        }),
        // Publish puts the version online in the background (SLJ-38).
        queryClient.invalidateQueries({ queryKey: ["sharing", "course", input.courseId] }),
      ]);
    },
  });
}

// How much space a course takes, for the Details card. It only changes with an
// edit, an update or a version switch: refetched when the card opens and when
// `revision` (the course's last edit) changes, not polled.
export function useCourseDiskUsageQuery(courseId: string | undefined, revision?: string | null) {
  return useQuery<CourseDiskUsage | null>({
    enabled: Boolean(courseId),
    queryKey: ["courses", "disk-usage", courseId, revision ?? null],
    queryFn: () => window.courses.getDiskUsage(courseId!),
  });
}
