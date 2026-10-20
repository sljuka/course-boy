import { afterEach, describe, expect, it, vi } from 'vitest'

import { type ActivityState, createCourseActivity } from './course-activity'
import type { CourseProgressState } from '../src/lib/course-progress'

// SLJ-168: a student's events worked out from progress, sent once each after
// a delay, and the teacher's totals.
const course = { sections: [{ id: 'basics', stepIds: ['lesson-1'] }], version: '1.0.0' }
const day = '2026-10-19T10:00:00.000Z'

function setup({ board = { driveKey: 'drive-i', isTeacher: false } as { driveKey: string; isTeacher: boolean } | null } = {}) {
  let state: ActivityState = { courses: {}, settings: { enabled: true } }
  let progress: CourseProgressState = { courses: {} }
  let clock = 1_000_000
  let currentBoard = board
  const sent: string[] = []
  const op = vi.fn(async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    if (name === 'activity') {
      sent.push(args.eventId as string)
      return { status: 'added' }
    }
    if (name === 'activityTotals') return { counted: 3, counts: { 'finished/1': 1, imported: 2 }, days: {} }
    if (name === 'read') return { moderation: { activity: false } }
    return {}
  })
  const activity = createCourseActivity({
    board: () => currentBoard,
    course: async (courseId) => (courseId === 'imported' ? course : null),
    imported: () => ({ imported: { followedSince: day } }),
    maxDelayMs: 1000,
    now: () => clock,
    op: op as never,
    progress: () => progress,
    random: () => 0.5,
    store: { read: () => state, write: (next) => (state = next) },
  })
  return {
    activity,
    advance: async (ms: number) => {
      clock += ms
      await activity.flush()
    },
    op,
    sent,
    setBoard: (next: typeof board) => (currentBoard = next),
    setProgress: (next: CourseProgressState) => (progress = next),
    state: () => state,
  }
}

afterEach(() => vi.useRealTimers())

describe('course activity', () => {
  it('sends each event once, after its delay', async () => {
    vi.useFakeTimers()
    const { activity, advance, sent, setProgress, state } = setup()
    await activity.sync()
    expect(sent).toEqual([])
    expect(state().courses.imported.queued).toMatchObject([{ dueAt: 1_000_500, eventId: 'imported' }])
    await advance(500)
    expect(sent).toEqual(['imported'])

    setProgress({ courses: { imported: { startedAt: day, steps: { 'lesson-1': { doneAt: day } } } } })
    await activity.sync(['imported'])
    await activity.sync(['imported'])
    await advance(500)
    expect(sent).toEqual(['imported', 'started', 'section/1/basics', 'finished/1'])
    activity.stop()
  })

  it('a new attempt sends the per-attempt events again, with their own names', async () => {
    vi.useFakeTimers()
    const { activity, advance, sent, setProgress } = setup()
    const finished = { courses: { imported: { startedAt: day, steps: { 'lesson-1': { doneAt: day } } } } }
    setProgress(finished)
    await activity.sync()
    await advance(500)
    activity.newAttempt('imported')
    await activity.sync()
    await advance(500)
    expect(sent.slice(4)).toEqual(['section/2/basics', 'finished/2'])
    activity.stop()
  })

  it('waits for the board, and sends nothing while off', async () => {
    vi.useFakeTimers()
    const { activity, advance, sent, setBoard, state } = setup({ board: null })
    await activity.sync()
    await advance(500)
    expect(sent).toEqual([])
    setBoard({ driveKey: 'drive-i', isTeacher: false })
    await activity.flush()
    expect(sent).toEqual(['imported'])

    activity.forget('imported')
    await activity.setSettings({ enabled: false })
    await activity.sync()
    expect(state().courses).toEqual({})
    await expect(activity.setSettings({ enabled: 'yes' })).rejects.toThrow()
    activity.stop()
  })

  it("reads the teacher's totals and switch", async () => {
    const { activity } = setup({ board: { driveKey: 'drive-t', isTeacher: true } })
    expect(await activity.get('mine')).toEqual({
      collect: false,
      status: 'ready',
      summary: { finished: [1], imported: 2, reachedEnd: [], sections: {}, started: 0 },
    })
    activity.stop()
  })
})
