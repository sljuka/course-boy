import type { DraftEditorRecord, DraftEditorSnapshot } from "@/lib/draft-editor-types";

function getDraftEditorStorageKey(courseId: string) {
  return `matko:draft-editor:${courseId}`;
}

function getDraftMetadataSignature(snapshot: DraftEditorSnapshot) {
  return JSON.stringify({
    contentRating: snapshot.contentRating,
    courseDescription: snapshot.courseDescription,
    courseId: snapshot.courseId,
    courseTitle: snapshot.courseTitle,
    supportedLocales: snapshot.supportedLocales,
  });
}

export async function loadDraftEditorRecord(courseId: string) {
  const storedValue = window.localStorage.getItem(getDraftEditorStorageKey(courseId));

  if (!storedValue) {
    return null;
  }

  const parsedValue = JSON.parse(storedValue) as DraftEditorRecord;

  return parsedValue;
}

export async function saveDraftEditorRecord(snapshot: DraftEditorSnapshot) {
  const previousRecord = await loadDraftEditorRecord(snapshot.courseId);

  if (
    !previousRecord ||
    getDraftMetadataSignature(previousRecord.snapshot) !==
      getDraftMetadataSignature(snapshot)
  ) {
    await window.courses.updateDraftMetadata({
      contentRating: snapshot.contentRating,
      courseId: snapshot.courseId,
      description: snapshot.courseDescription,
      supportedLocales: snapshot.supportedLocales,
      title: snapshot.courseTitle,
    });
  }

  const nextRecord: DraftEditorRecord = {
    savedAt: new Date().toISOString(),
    snapshot,
  };

  window.localStorage.setItem(
    getDraftEditorStorageKey(snapshot.courseId),
    JSON.stringify(nextRecord),
  );

  return nextRecord;
}
