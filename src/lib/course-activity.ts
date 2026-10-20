import type { CourseProgress } from "@/lib/course-progress";

// Course activity (SLJ-168): about how many students imported, started and
// finished a course, for its teacher. A student's device works the events
// out from their progress (`activityEventsFromProgress`) and sends each once,
// sealed for the teacher, signed by a key of its own (workers/activity-
// events.cjs); main sends them (electron/course-activity.ts). The teacher's
// device counts each key once and keeps only totals, which the window reads
// as an `ActivitySummary`.
//
// Events: imported and started once; section finished, reached the end and
// course finished once per attempt (a new attempt starts with "Start over"
// or "Clear course progress"), for the first MAX_ACTIVITY_ATTEMPTS attempts.
// "Finished" is course progress: every lesson and test done, whatever the
// scores.

export const MAX_ACTIVITY_ATTEMPTS = 5;

// How much of the course was done on reaching its end. Bands, not a
// percentage, so one event isn't a fingerprint.
export const ACTIVITY_BANDS = ["under-25", "25-49", "50-74", "75-99", "all"] as const;
export type ActivityBand = (typeof ACTIVITY_BANDS)[number];

export type ActivityPayload =
  | { kind: "imported" | "started"; version?: string }
  | { attempt: number; kind: "finished"; version?: string }
  | { attempt: number; kind: "section"; section: string; version?: string }
  | { attempt: number; band: ActivityBand; kind: "end"; version?: string };

// One event to send: `eventId` names it (and, with the course's id, its
// key), `day` is when it happened (days since 1970).
export type ActivityEvent = { day: number; eventId: string; payload: ActivityPayload };

// The teacher's totals as the worker keeps them: counters by name
// ("imported", "finished/2", "section/1/<id>", "end/1/all") and the daily
// ones by day.
export type ActivityWorkerTotals = {
  counted: number;
  counts: Record<string, number>;
  days: Record<string, Record<string, number>>;
};

// What the Activity tab and page show. Per-attempt counts are listed by
// attempt, the first attempt first.
export type ActivitySummary = {
  finished: number[];
  imported: number;
  reachedEnd: Record<ActivityBand, number>[];
  sections: Record<string, number[]>;
  started: number;
};

// A course's activity on the teacher's device:
// - unavailable: not one of this profile's published courses, or not open
//   (the identity is locked, or shared by several maintainers);
// - ready: what's counted, and whether the course collects activity
//   (`collect`, the teacher's switch).
export type CourseActivity =
  | { status: "unavailable" }
  | { collect: boolean; status: "ready"; summary: ActivitySummary };

// This profile's activity settings: whether its own progress is shared with
// teachers at all.
export type ActivitySettings = { enabled: boolean };

const DAY_MS = 24 * 60 * 60_000;

export function dayOf(iso: string): number {
  return Math.floor(Date.parse(iso) / DAY_MS);
}

export function bandOf(done: number, total: number): ActivityBand {
  if (total > 0 && done >= total) return "all";
  const share = total > 0 ? done / total : 0;
  if (share < 0.25) return "under-25";
  if (share < 0.5) return "25-49";
  if (share < 0.75) return "50-74";
  return "75-99";
}

export type ActivityCourse = {
  // The steps of each section (its lessons, their tests and its own tests).
  sections: { id: string; stepIds: string[] }[];
  version?: string;
};

function latest(dates: string[]): string {
  return dates.reduce((newest, date) => (date > newest ? date : newest));
}

// The events a student's progress means, whether or not they were sent.
// `attempt`: which attempt the progress belongs to; `importedAt`: when the
// course was added to this device.
export function activityEventsFromProgress({
  attempt,
  course,
  importedAt,
  progress,
}: {
  attempt: number;
  course: ActivityCourse;
  importedAt: string | null;
  progress: CourseProgress | undefined;
}): ActivityEvent[] {
  const version = course.version ? { version: course.version } : {};
  const events: ActivityEvent[] = [];
  if (importedAt) events.push({ day: dayOf(importedAt), eventId: "imported", payload: { kind: "imported", ...version } });

  const doneAt = (stepId: string) => progress?.steps[stepId]?.doneAt;
  const allDone = Object.values(progress?.steps ?? {})
    .map((step) => step.doneAt)
    .filter((at): at is string => Boolean(at));
  const startedAt = progress?.startedAt ?? (allDone.length > 0 ? allDone.reduce((a, b) => (a < b ? a : b)) : null);
  if (startedAt) events.push({ day: dayOf(startedAt), eventId: "started", payload: { kind: "started", ...version } });

  if (attempt < 1 || attempt > MAX_ACTIVITY_ATTEMPTS) return events;
  const courseDates: string[] = [];
  let isFinished = course.sections.some((section) => section.stepIds.length > 0);
  for (const section of course.sections) {
    if (section.stepIds.length === 0) continue;
    const dates = section.stepIds.map(doneAt);
    if (!dates.every(Boolean)) {
      isFinished = false;
      continue;
    }
    const finishedAt = latest(dates as string[]);
    courseDates.push(finishedAt);
    events.push({
      day: dayOf(finishedAt),
      eventId: `section/${attempt}/${section.id}`,
      payload: { attempt, kind: "section", section: section.id, ...version },
    });
  }
  if (progress?.reachedEnd) {
    const { at, done, total } = progress.reachedEnd;
    events.push({
      day: dayOf(at),
      eventId: `end/${attempt}`,
      payload: { attempt, band: bandOf(done, total), kind: "end", ...version },
    });
  }
  if (isFinished) {
    events.push({
      day: dayOf(latest(courseDates)),
      eventId: `finished/${attempt}`,
      payload: { attempt, kind: "finished", ...version },
    });
  }
  return events;
}

function emptyBands(): Record<ActivityBand, number> {
  return { "25-49": 0, "50-74": 0, "75-99": 0, all: 0, "under-25": 0 };
}

// The worker's counters as the window shows them.
export function summarizeActivity(counts: Record<string, number>): ActivitySummary {
  const summary: ActivitySummary = {
    finished: [],
    imported: counts.imported ?? 0,
    reachedEnd: [],
    sections: {},
    started: counts.started ?? 0,
  };
  const attemptIndex = (value: string) => {
    const attempt = Number(value);
    return Number.isInteger(attempt) && attempt >= 1 && attempt <= MAX_ACTIVITY_ATTEMPTS ? attempt - 1 : null;
  };
  const setAt = (list: number[], index: number, count: number) => {
    while (list.length <= index) list.push(0);
    list[index] = count;
  };
  for (const [name, count] of Object.entries(counts)) {
    const [kind, attempt, ...rest] = name.split("/");
    const index = attempt === undefined ? null : attemptIndex(attempt);
    if (index === null) continue;
    if (kind === "finished") setAt(summary.finished, index, count);
    else if (kind === "section" && rest.length > 0) setAt((summary.sections[rest.join("/")] ??= []), index, count);
    else if (kind === "end" && (ACTIVITY_BANDS as readonly string[]).includes(rest[0] ?? "")) {
      while (summary.reachedEnd.length <= index) summary.reachedEnd.push(emptyBands());
      summary.reachedEnd[index][rest[0] as ActivityBand] = count;
    }
  }
  return summary;
}
