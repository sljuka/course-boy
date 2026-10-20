// Course activity on this device (SLJ-168).
//
// As a student: for each imported course, the events its progress means
// (`activityEventsFromProgress`) are queued once each and sent at a random
// moment within MAX_DELAY_MS, so one student's events can't be linked by
// their timing. The queue is kept, so an event waits through a restart.
// Sent through the course's board in the worker, which seals it for the
// teacher and passes it on (workers/board-sync.cjs). Nothing is sent while
// the student has activity off in Settings, or while the teacher has the
// course not collecting it.
//
// As a teacher: what the worker counted for each of this profile's
// published courses.
//
// Attempts: "Start over" and "Clear course progress" start the next one; the
// number is kept here, apart from progress, so clearing doesn't reset it.

import {
  type ActivityCourse,
  type ActivityEvent,
  type ActivitySettings,
  type ActivitySummary,
  activityEventsFromProgress,
  type CourseActivity,
  summarizeActivity,
} from '../src/lib/course-activity'
import type { CourseProgressState } from '../src/lib/course-progress'
import type { boardOp } from './bare-worker'

type QueuedEvent = ActivityEvent & { dueAt: number }

type CourseActivityState = {
  // Missing: the first attempt.
  attempt?: number
  queued: QueuedEvent[]
  sent: string[]
}

export type ActivityState = {
  courses: Record<string, CourseActivityState>
  settings: ActivitySettings
}

export const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = { enabled: true }

// Events go out at a random moment within this long; tests shorten it
// (MATKO_ACTIVITY_DELAY_MS).
const MAX_DELAY_MS = 2 * 60 * 60_000
// An event that couldn't go out (the course's board not open yet) is tried
// again after this long.
const RETRY_MS = 5 * 60_000

export type CourseActivityDeps = {
  // An imported course's structure and version, or null when it isn't here.
  course(courseId: string): Promise<ActivityCourse | null>
  // The code of a course whose board is open in the worker, and whether it's
  // this profile's own (published) course.
  board(courseId: string): { driveKey: string; isTeacher: boolean } | null
  // Imported courses, with when they were imported.
  imported(): Record<string, { followedSince?: string }>
  maxDelayMs?: number
  now?: () => number
  op: typeof boardOp
  progress(): CourseProgressState
  random?: () => number
  store: { read(): ActivityState; write(state: ActivityState): void }
}

export function createCourseActivity(deps: CourseActivityDeps) {
  const now = deps.now ?? Date.now
  const random = deps.random ?? Math.random
  const maxDelayMs = deps.maxDelayMs ?? MAX_DELAY_MS
  let timer: ReturnType<typeof setTimeout> | null = null
  let sending: Promise<void> = Promise.resolve()
  let stopped = false

  function state(): ActivityState {
    const current = deps.store.read()
    return { courses: current.courses ?? {}, settings: { ...DEFAULT_ACTIVITY_SETTINGS, ...current.settings } }
  }

  function courseState(current: ActivityState, courseId: string): CourseActivityState {
    return current.courses[courseId] ?? { queued: [], sent: [] }
  }

  function updateCourse(courseId: string, change: (course: CourseActivityState) => CourseActivityState) {
    const current = state()
    deps.store.write({ ...current, courses: { ...current.courses, [courseId]: change(courseState(current, courseId)) } })
  }

  // The next check: when the earliest queued event is due.
  function schedule(at?: number) {
    if (stopped) return
    if (timer) clearTimeout(timer)
    timer = null
    const due = Object.values(state().courses).flatMap((course) => course.queued.map((event) => event.dueAt))
    const next = Math.min(at ?? Infinity, ...due)
    if (!Number.isFinite(next)) return
    timer = setTimeout(() => void send(), Math.max(next - now(), 1000))
  }

  // Queues what a course's progress means and hasn't been sent or queued.
  async function queueCourse(courseId: string, importedAt: string | null): Promise<void> {
    const course = await deps.course(courseId)
    if (!course) return
    const current = courseState(state(), courseId)
    const known = new Set([...current.sent, ...current.queued.map((event) => event.eventId)])
    const events = activityEventsFromProgress({
      attempt: current.attempt ?? 1,
      course,
      importedAt,
      progress: deps.progress().courses[courseId],
    }).filter((event) => !known.has(event.eventId))
    if (events.length === 0) return
    updateCourse(courseId, (stored) => ({
      ...stored,
      queued: [...stored.queued, ...events.map((event) => ({ ...event, dueAt: now() + Math.floor(random() * maxDelayMs) }))],
    }))
  }

  // Due events out, one course's board at a time.
  async function sendNow(): Promise<void> {
    if (stopped || !state().settings.enabled) return
    let retryAt: number | undefined
    for (const [courseId, course] of Object.entries(state().courses)) {
      const due = course.queued.filter((event) => event.dueAt <= now())
      if (due.length === 0) continue
      const board = deps.board(courseId)
      if (!board || board.isTeacher) {
        retryAt = now() + RETRY_MS
        continue
      }
      for (const event of due) {
        try {
          await deps.op('activity', { courseId, day: event.day, driveKey: board.driveKey, eventId: event.eventId, payload: event.payload })
          updateCourse(courseId, (stored) => ({
            ...stored,
            queued: stored.queued.filter((entry) => entry.eventId !== event.eventId),
            sent: [...stored.sent, event.eventId],
          }))
        } catch (error) {
          // The teacher doesn't collect it: dropped (worked out again, and
          // dropped again, until they do).
          if ((error as { code?: string }).code === 'ACTIVITY_OFF') {
            updateCourse(courseId, (stored) => ({
              ...stored,
              queued: stored.queued.filter((entry) => entry.eventId !== event.eventId),
            }))
          } else {
            console.error(`[course-activity] sending ${event.eventId} of ${courseId} failed:`, error)
            retryAt = now() + RETRY_MS
          }
        }
      }
    }
    schedule(retryAt)
  }

  function send(): Promise<void> {
    sending = sending.then(sendNow, sendNow)
    return sending
  }

  async function syncNow(courseIds?: string[]): Promise<void> {
    if (stopped || !state().settings.enabled) return
    const imported = deps.imported()
    for (const courseId of courseIds ?? Object.keys(imported)) {
      if (!(courseId in imported)) continue
      try {
        await queueCourse(courseId, imported[courseId].followedSince ?? null)
      } catch (error) {
        console.error(`[course-activity] working out ${courseId}'s activity failed:`, error)
      }
    }
    await send()
  }

  async function readCourse(courseId: string): Promise<CourseActivity> {
    const board = deps.board(courseId)
    if (!board?.isTeacher) return { status: 'unavailable' }
    const [totals, page] = await Promise.all([
      deps.op('activityTotals', { driveKey: board.driveKey }),
      deps.op('read', { driveKey: board.driveKey, limit: 0 }),
    ])
    if ('closed' in totals || 'closed' in page) return { status: 'unavailable' }
    return { collect: page.moderation?.activity !== false, status: 'ready', summary: summarizeActivity(totals.counts) }
  }

  return {
    // What progress means for these imported courses (all when none are
    // named), queued and, when due, sent.
    sync: syncNow,

    // The course's board opened: what was waiting for it can go.
    flush: send,

    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
      timer = null
    },

    // "Start over" or "Clear course progress": the course's next attempt.
    newAttempt(courseId: string) {
      updateCourse(courseId, (course) => ({ ...course, attempt: (course.attempt ?? 1) + 1 }))
    },

    // The course is gone from this device: what wasn't sent goes too.
    forget(courseId: string) {
      const current = state()
      if (!(courseId in current.courses)) return
      const { [courseId]: _removed, ...courses } = current.courses
      deps.store.write({ ...current, courses })
    },

    // The teacher's view of one of their courses.
    get: readCourse,

    // The teacher's courses with what's counted, for the Activity page.
    async list(courseIds: string[]): Promise<Record<string, ActivitySummary>> {
      const summaries: Record<string, ActivitySummary> = {}
      for (const courseId of courseIds) {
        const activity = await readCourse(courseId).catch(() => null)
        if (activity?.status === 'ready') summaries[courseId] = activity.summary
      }
      return summaries
    },

    getSettings(): ActivitySettings {
      return state().settings
    },

    // Off: nothing waiting goes out, and nothing more is worked out. On
    // again: what progress means is worked out again (sent ones aren't resent).
    async setSettings(changes: unknown): Promise<ActivitySettings> {
      const enabled = (changes as Partial<ActivitySettings> | null)?.enabled
      if (typeof enabled !== 'boolean') throw new Error('Invalid activity settings')
      const current = state()
      const courses = enabled
        ? current.courses
        : Object.fromEntries(Object.entries(current.courses).map(([id, course]) => [id, { ...course, queued: [] }]))
      deps.store.write({ courses, settings: { ...current.settings, enabled } })
      if (enabled) await syncNow()
      else schedule()
      return { ...current.settings, enabled }
    },
  }
}

export type CourseActivityService = ReturnType<typeof createCourseActivity>
