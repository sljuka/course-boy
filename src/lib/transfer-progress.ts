import type { TransferInfo } from "@/lib/sharing";

// After this long still "finding", the student is told that nobody sharing the
// course is online right now (it keeps waiting; Cancel is always there).
export const NOBODY_ONLINE_AFTER_MS = 30_000;

export function isNobodyOnline(transfer: Pick<TransferInfo, "elapsedMs" | "phase">): boolean {
  return transfer.phase === "finding" && transfer.elapsedMs >= NOBODY_ONLINE_AFTER_MS;
}

// 0–100, or null while the total isn't known yet.
export function transferPercent(transfer: Pick<TransferInfo, "bytesDone" | "bytesTotal">): number | null {
  if (transfer.bytesTotal === null) return null;
  if (transfer.bytesTotal === 0) return 100;
  return Math.min(100, Math.round((transfer.bytesDone / transfer.bytesTotal) * 100));
}

// "12.3 MB", "850 kB", "4 B" in the reader's language.
export function formatBytes(bytes: number, locale: string): string {
  const units = [
    { size: 1e9, unit: "gigabyte" },
    { size: 1e6, unit: "megabyte" },
    { size: 1e3, unit: "kilobyte" },
  ] as const;
  const match = units.find(({ size }) => bytes >= size);

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: match && bytes / match.size < 10 ? 1 : 0,
    style: "unit",
    unit: match?.unit ?? "byte",
    unitDisplay: "short",
  }).format(match ? bytes / match.size : bytes);
}

// An import's course title in the reader's language (else the course's
// default, else any), once its manifest has arrived; null before that.
export function transferCourseTitle(transfer: Pick<TransferInfo, "course"> | null | undefined, locale: string): string | null {
  const course = transfer?.course;
  if (!course) return null;
  return (
    course.titles[locale] ||
    (course.defaultLocale ? course.titles[course.defaultLocale] : undefined) ||
    Object.values(course.titles).find(Boolean) ||
    null
  );
}
