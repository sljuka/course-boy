import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSaveDraftEditorRecordMutation } from "@/lib/draft-editor-queries";
import type { DraftEditorRecord, DraftEditorSnapshot } from "@/lib/draft-editor-types";
import type { CourseSectionPreview } from "@/lib/course-package";

type DraftAutosaveStatus = "error" | "idle" | "dirty" | "saved" | "saving";
const AUTOSAVE_DEBOUNCE_MS = 3000;

function serializeSnapshot(snapshot: DraftEditorSnapshot | null) {
  return snapshot ? JSON.stringify(snapshot) : null;
}

export function useDraftEditorAutosave({
  courseId,
  courseSections,
  initialRecord,
  isReady,
  snapshot,
}: {
  courseId: string | undefined;
  courseSections: CourseSectionPreview[];
  initialRecord: DraftEditorRecord | null | undefined;
  isReady: boolean;
  snapshot: DraftEditorSnapshot | null;
}) {
  const saveMutation = useSaveDraftEditorRecordMutation(courseId);
  const courseSectionsRef = useRef(courseSections);

  useEffect(() => {
    courseSectionsRef.current = courseSections;
  }, [courseSections]);
  const [status, setStatus] = useState<DraftAutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const latestSnapshotRef = useRef<DraftEditorSnapshot | null>(snapshot);
  const lastSavedSnapshotRef = useRef<DraftEditorSnapshot | null>(null);
  const lastFailedSnapshotRef = useRef<DraftEditorSnapshot | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    latestSnapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    lastSavedSnapshotRef.current = initialRecord?.snapshot ?? null;
    setLastSavedAt(initialRecord?.savedAt ?? null);
    setErrorMessage(null);
    setStatus(initialRecord ? "saved" : "idle");
  }, [courseId, initialRecord]);

  const clearScheduledSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const persistSnapshot = useCallback((nextSnapshot: DraftEditorSnapshot) => {
    setStatus("saving");
    setErrorMessage(null);

    saveMutation.mutate({
      courseSections: courseSectionsRef.current,
      snapshot: nextSnapshot,
    }, {
      onError: (error) => {
        lastFailedSnapshotRef.current = nextSnapshot;
        setErrorMessage(error.message);
        setStatus("error");
      },
      onSuccess: (record) => {
        lastFailedSnapshotRef.current = null;
        lastSavedSnapshotRef.current = record.snapshot;
        setLastSavedAt(record.savedAt);

        if (
          serializeSnapshot(latestSnapshotRef.current) ===
          serializeSnapshot(record.snapshot)
        ) {
          setStatus("saved");
          return;
        }

        setStatus("dirty");
      },
    });
  }, [saveMutation]);

  const saveNow = useCallback(() => {
    clearScheduledSave();

    if (!latestSnapshotRef.current) {
      return;
    }

    if (
      serializeSnapshot(latestSnapshotRef.current) ===
      serializeSnapshot(lastSavedSnapshotRef.current)
    ) {
      setStatus(lastSavedSnapshotRef.current ? "saved" : "idle");
      return;
    }

    persistSnapshot(latestSnapshotRef.current);
  }, [clearScheduledSave, persistSnapshot]);

  useEffect(() => {
    if (!isReady || !snapshot) {
      return;
    }

    if (serializeSnapshot(snapshot) === serializeSnapshot(lastSavedSnapshotRef.current)) {
      setStatus(lastSavedSnapshotRef.current ? "saved" : "idle");
      clearScheduledSave();
      return;
    }

    if (serializeSnapshot(snapshot) === serializeSnapshot(lastFailedSnapshotRef.current)) {
      return;
    }

    setStatus("dirty");
    setErrorMessage(null);
    clearScheduledSave();

    saveTimerRef.current = window.setTimeout(() => {
      persistSnapshot(snapshot);
    }, AUTOSAVE_DEBOUNCE_MS);

    return clearScheduledSave;
  }, [clearScheduledSave, isReady, persistSnapshot, snapshot]);

  const isSaving = status === "saving";

  return useMemo(
    () => ({
      errorMessage,
      isSaving,
      lastSavedAt,
      saveNow,
      status,
    }),
    [errorMessage, isSaving, lastSavedAt, saveNow, status],
  );
}
