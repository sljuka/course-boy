import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import type { DraftEditorRecord, DraftEditorSnapshot } from "@/lib/draft-editor-types";
import {
  loadDraftEditorRecord,
  saveDraftEditorRecord,
} from "@/lib/draft-editor-storage";

function getDraftEditorQueryKey(courseId: string | undefined) {
  return ["draft-editor", courseId];
}

export function useDraftEditorRecordQuery(courseId: string | undefined) {
  return useQuery<DraftEditorRecord | null>({
    enabled: Boolean(courseId),
    queryKey: getDraftEditorQueryKey(courseId),
    queryFn: () => loadDraftEditorRecord(courseId!),
  });
}

export function useSaveDraftEditorRecordMutation(courseId: string | undefined) {
  return useMutation<DraftEditorRecord, Error, DraftEditorSnapshot>({
    mutationFn: (snapshot) => saveDraftEditorRecord(snapshot),
    onSuccess: (record) => {
      if (!courseId) {
        return;
      }

      queryClient.setQueryData(getDraftEditorQueryKey(courseId), record);
    },
  });
}
