import { useCallback, useEffect, useRef, useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";

export type EntityAutosaveStatus = "dirty" | "error" | "saved" | "saving";

const AUTOSAVE_DEBOUNCE_MS = 3000;

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Debounced autosave for a single draft entity (course metadata, one
 * section, one document, one test) — the per-entity replacement for the old
 * whole-course `useDraftEditorAutosave`. Every editor gets its own instance
 * instead of feeding one shared aggregate snapshot, so there is no
 * reconciliation step between entities: each one just watches its own
 * `value` and saves itself.
 */
export function useEntityAutosave<TValue, TInput>({
  buildInput,
  initialValue,
  mutation,
  value,
}: {
  buildInput: (value: TValue) => TInput;
  // The entity's own already-persisted value. Callers are expected to defer
  // mounting the component that calls this hook until their own query has
  // resolved (see the per-entity wrapper components in
  // `draft-detail-page.tsx`), so there is no "not loaded yet" state to model
  // here — `initialValue` is always a real, already-loaded value.
  initialValue: TValue;
  mutation: UseMutationResult<unknown, Error, TInput>;
  value: TValue;
}) {
  const [status, setStatus] = useState<EntityAutosaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const latestValueRef = useRef(value);
  const lastSavedValueRef = useRef(serialize(initialValue));
  const lastFailedValueRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  latestValueRef.current = value;

  useEffect(() => {
    lastSavedValueRef.current = serialize(initialValue);
    lastFailedValueRef.current = null;
    setErrorMessage(null);
    setStatus("saved");
    // Re-baseline whenever the entity's own persisted value changes identity
    // (e.g. after an invalidation-triggered refetch) — not on every
    // keystroke, which is `value`, a separate prop.
  }, [initialValue]);

  const clearScheduledSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const persist = useCallback(
    (valueToSave: TValue) => {
      setStatus("saving");
      setErrorMessage(null);

      const serialized = serialize(valueToSave);

      mutation.mutate(buildInput(valueToSave), {
        onError: (error) => {
          lastFailedValueRef.current = serialized;
          setErrorMessage(error.message);
          setStatus("error");
        },
        onSuccess: () => {
          lastFailedValueRef.current = null;
          lastSavedValueRef.current = serialized;
          setStatus(serialize(latestValueRef.current) === serialized ? "saved" : "dirty");
        },
      });
    },
    // `mutation.mutate` (not `mutation` itself) is the dependency: React
    // Query returns a brand-new mutation result object on every render, but
    // `.mutate` is internally memoized and stable — depending on the whole
    // object would recreate `persist` (and everything downstream: `saveNow`,
    // the debounce effect below) on every render, resetting the pending
    // timer before it ever gets to elapse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildInput, mutation.mutate],
  );

  const saveNow = useCallback(() => {
    clearScheduledSave();

    const serialized = serialize(latestValueRef.current);

    if (serialized === lastSavedValueRef.current) {
      setStatus("saved");
      return;
    }

    persist(latestValueRef.current);
  }, [clearScheduledSave, persist]);

  useEffect(() => {
    const serialized = serialize(value);

    if (serialized === lastSavedValueRef.current) {
      setStatus("saved");
      clearScheduledSave();
      return;
    }

    if (serialized === lastFailedValueRef.current) {
      return;
    }

    setStatus("dirty");
    setErrorMessage(null);
    clearScheduledSave();

    saveTimerRef.current = window.setTimeout(() => {
      persist(value);
    }, AUTOSAVE_DEBOUNCE_MS);

    return clearScheduledSave;
  }, [clearScheduledSave, persist, value]);

  const saveNowRef = useRef(saveNow);

  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

  useEffect(() => {
    return () => {
      saveNowRef.current();
    };
    // Flush on unmount only, e.g. navigating away before the debounce fires.
  }, []);

  return { errorMessage, saveNow, status };
}

/**
 * Forwards one entity editor's autosave status up to the shared status bar
 * in `CourseLayout`, which otherwise has no way to see inside whichever
 * editor happens to be mounted below it.
 */
export function useForwardAutosaveStatus(
  report: (
    status: EntityAutosaveStatus | null,
    errorMessage: string | null,
    retry?: () => void,
  ) => void,
  autosave: { errorMessage: string | null; saveNow: () => void; status: EntityAutosaveStatus },
) {
  useEffect(() => {
    report(autosave.status, autosave.errorMessage, autosave.saveNow);
  }, [autosave.errorMessage, autosave.saveNow, autosave.status, report]);

  useEffect(() => {
    return () => report(null, null);
  }, [report]);
}
