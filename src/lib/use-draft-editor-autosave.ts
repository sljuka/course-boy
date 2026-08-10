import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSaveDraftEditorRecordMutation } from "@/lib/draft-editor-queries";
import type { DraftEditorRecord, DraftEditorSnapshot } from "@/lib/draft-editor-types";

type DraftAutosaveStatus = "error" | "idle" | "dirty" | "saved" | "saving";
const AUTOSAVE_DEBOUNCE_MS = 3000;

function serializeSnapshot(snapshot: DraftEditorSnapshot | null) {
  return snapshot ? JSON.stringify(snapshot) : null;
}

export function useDraftEditorAutosave({
  courseId,
  initialRecord,
  isReady,
  snapshot,
}: {
  courseId: string | undefined;
  initialRecord: DraftEditorRecord | null | undefined;
  isReady: boolean;
  snapshot: DraftEditorSnapshot | null;
}) {
  const saveMutation = useSaveDraftEditorRecordMutation(courseId);
  const [status, setStatus] = useState<DraftAutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const latestSnapshotRef = useRef<DraftEditorSnapshot | null>(snapshot);
  const lastSavedSerializedRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    latestSnapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    lastSavedSerializedRef.current = serializeSnapshot(initialRecord?.snapshot ?? null);
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

    saveMutation.mutate(nextSnapshot, {
      onError: (error) => {
        setErrorMessage(error.message);
        setStatus("error");
      },
      onSuccess: (record) => {
        lastSavedSerializedRef.current = serializeSnapshot(record.snapshot);
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

    const nextSerialized = serializeSnapshot(latestSnapshotRef.current);

    if (nextSerialized === lastSavedSerializedRef.current) {
      setStatus(lastSavedSerializedRef.current ? "saved" : "idle");
      return;
    }

    persistSnapshot(latestSnapshotRef.current);
  }, [clearScheduledSave, persistSnapshot]);

  useEffect(() => {
    if (!isReady || !snapshot) {
      return;
    }

    const nextSerialized = serializeSnapshot(snapshot);

    if (nextSerialized === lastSavedSerializedRef.current) {
      setStatus(lastSavedSerializedRef.current ? "saved" : "idle");
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
