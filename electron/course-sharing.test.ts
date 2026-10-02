import { describe, expect, it, vi } from 'vitest'

import {
  createCourseSharing,
  type CourseSharingState,
  type CourseSharingWorker,
} from './course-sharing'

function setup({
  consent = true,
  published = [] as string[],
  initial = { followed: {}, published: {} } as CourseSharingState,
  worker: workerOverrides = {} as Partial<CourseSharingWorker>,
} = {}) {
  let state = initial
  let hasConsent = consent
  const timers: { callback: () => void; delayMs: number; cancelled: boolean }[] = []
  const worker: CourseSharingWorker = {
    followCourse: vi.fn(async () => {}),
    importCourse: vi.fn(async () => ({ courseId: 'course-b', driveKey: 'drive-b', publisherId: 'teacher' })),
    publishCourse: vi.fn(async (courseId: string) => `code-${courseId}`),
    stopSharing: vi.fn(async () => {}),
    ...workerOverrides,
  }
  const sharing = createCourseSharing({
    hasConsent: () => hasConsent,
    listPublishedCourseIds: async () => published,
    now: () => new Date('2026-10-03T10:00:00Z'),
    setTimer: (callback, delayMs) => {
      const timer = { callback, cancelled: false, delayMs }
      timers.push(timer)
      return { cancel: () => (timer.cancelled = true) }
    },
    store: { read: () => state, write: (next) => (state = next) },
    worker,
  })

  return {
    giveConsent: () => (hasConsent = true),
    sharing,
    state: () => state,
    timers,
    worker,
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('course sharing: teacher', () => {
  it('shares a published course in the background and keeps its code', async () => {
    const { sharing, state, worker } = setup()

    sharing.onPublished('course-a')
    expect(sharing.getInfo('course-a').status).toBe('sharing')
    await flush()

    expect(worker.publishCourse).toHaveBeenCalledWith('course-a')
    expect(sharing.getInfo('course-a')).toEqual({ code: 'code-course-a', status: 'shared' })
    expect(state().published['course-a']).toEqual({ code: 'code-course-a' })
  })

  it("shares nothing until the teacher has given the sharing consent, then shares what's published", async () => {
    const { giveConsent, sharing, worker } = setup({ consent: false, published: ['course-a'] })

    await sharing.start()
    sharing.onPublished('course-a')
    await flush()
    expect(worker.publishCourse).not.toHaveBeenCalled()
    expect(sharing.getInfo('course-a')).toEqual({ code: null, status: 'not-shared' })

    giveConsent()
    sharing.onConsentGiven()
    await flush()
    expect(worker.publishCourse).toHaveBeenCalledWith('course-a')
  })

  it('reshares every published course at startup', async () => {
    const { sharing, worker } = setup({ published: ['course-a', 'course-c'] })

    await sharing.start()

    expect(worker.publishCourse).toHaveBeenCalledWith('course-a')
    expect(worker.publishCourse).toHaveBeenCalledWith('course-c')
  })

  it('keeps a known code while waiting, and retries a failed share with a growing delay', async () => {
    const publishCourse = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue('code-course-a')
    const { sharing, timers } = setup({
      initial: { followed: {}, published: { 'course-a': { code: 'code-course-a' } } },
      worker: { publishCourse },
    })

    sharing.onPublished('course-a')
    await flush()
    expect(sharing.getInfo('course-a')).toEqual({ code: 'code-course-a', status: 'waiting' })
    expect(timers.at(-1)?.delayMs).toBe(30_000)

    timers.at(-1)!.callback()
    await flush()
    expect(timers.at(-1)?.delayMs).toBe(60_000)

    timers.at(-1)!.callback()
    await flush()
    expect(sharing.getInfo('course-a').status).toBe('shared')
  })

  it('shares again when a version is published while a share is still running', async () => {
    let finishFirst!: () => void
    const publishCourse = vi
      .fn()
      .mockImplementationOnce(() => new Promise<string>((resolve) => (finishFirst = () => resolve('code'))))
      .mockResolvedValue('code')
    const { sharing } = setup({ worker: { publishCourse } })

    sharing.onPublished('course-a')
    sharing.onPublished('course-a')
    expect(publishCourse).toHaveBeenCalledTimes(1)

    finishFirst()
    await flush()
    await flush()
    expect(publishCourse).toHaveBeenCalledTimes(2)
  })
})

describe('course sharing: student', () => {
  it('records where an imported course came from: the code used, not its files', async () => {
    const { sharing, state } = setup()

    await expect(sharing.importCourse('drive-b')).resolves.toEqual({ courseId: 'course-b' })

    expect(state().followed['course-b']).toEqual({
      driveKey: 'drive-b',
      followedSince: '2026-10-03T10:00:00.000Z',
      publisherId: 'teacher',
    })
  })

  it('follows every imported course again at startup', async () => {
    const { sharing, worker } = setup({
      initial: {
        followed: { 'course-b': { driveKey: 'drive-b', followedSince: '', publisherId: '' } },
        published: {},
      },
    })

    await sharing.start()

    expect(worker.followCourse).toHaveBeenCalledWith('drive-b')
    expect(sharing.getInfo('course-b').status).toBe('shared')
  })

  it('needs no sharing consent to import or follow', async () => {
    const { sharing, worker } = setup({
      consent: false,
      initial: {
        followed: { 'course-b': { driveKey: 'drive-b', followedSince: '', publisherId: '' } },
        published: {},
      },
    })

    await sharing.start()
    await sharing.importCourse('drive-x')

    expect(worker.followCourse).toHaveBeenCalled()
    expect(worker.importCourse).toHaveBeenCalled()
  })
})

describe('course sharing: removing a course', () => {
  it('stops sharing it and forgets it', async () => {
    const { sharing, state, worker } = setup({
      initial: {
        followed: { 'course-b': { driveKey: 'drive-b', followedSince: '', publisherId: '' } },
        published: { 'course-a': { code: 'code-a' } },
      },
    })

    await sharing.forgetCourse('course-a')
    await sharing.forgetCourse('course-b')

    expect(worker.stopSharing).toHaveBeenCalledWith({ courseId: 'course-a' })
    expect(worker.stopSharing).toHaveBeenCalledWith({ driveKey: 'drive-b' })
    expect(state()).toEqual({ followed: {}, published: {} })
    expect(sharing.getInfo('course-a')).toEqual({ code: null, status: 'not-shared' })
  })
})
