import { describe, expect, it, vi } from 'vitest'

import {
  createCourseSharing,
  describeUpdate,
  evaluateRemoteVersion,
  type CourseSharingState,
  type CourseSharingWorker,
} from './course-sharing'

function setup({
  consent = true,
  published = [] as string[],
  initial = { followed: {}, published: {} } as CourseSharingState,
  worker: workerOverrides = {} as Partial<CourseSharingWorker>,
  installedVersion = '0.1.0',
} = {}) {
  let state = initial
  let hasConsent = consent
  const timers: { callback: () => void; delayMs: number; cancelled: boolean }[] = []
  const worker: CourseSharingWorker = {
    checkUpdate: vi.fn(async () => ({ changelog: [], courseId: null, source: null, version: null })),
    downloadUpdate: vi.fn(async () => ({ changedFiles: [] })),
    followCourse: vi.fn(async () => {}),
    importCourse: vi.fn(async () => ({ courseId: 'course-b', driveKey: 'drive-b', publisherId: 'teacher' })),
    publishCourse: vi.fn(async (courseId: string) => `code-${courseId}`),
    stopSharing: vi.fn(async () => {}),
    ...workerOverrides,
  }
  const sharing = createCourseSharing({
    applyUpdateFiles: async (_expected, download) => download('/staging'),
    hasConsent: () => hasConsent,
    listInstalledVersions: async () => ({ current: installedVersion, versions: [installedVersion] }),
    readInstalledVersion: async () => installedVersion,
    switchInstalledVersion: async () => {},
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
    expect(sharing.getInfo('course-a')).toMatchObject({ code: 'code-course-a', status: 'shared' })
    expect(state().published['course-a']).toEqual({ code: 'code-course-a' })
  })

  it("shares nothing until the teacher has given the sharing consent, then shares what's published", async () => {
    const { giveConsent, sharing, worker } = setup({ consent: false, published: ['course-a'] })

    await sharing.start()
    sharing.onPublished('course-a')
    await flush()
    expect(worker.publishCourse).not.toHaveBeenCalled()
    expect(sharing.getInfo('course-a')).toMatchObject({ code: null, status: 'not-shared' })

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
    expect(sharing.getInfo('course-a')).toMatchObject({ code: 'code-course-a', status: 'waiting' })
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
    expect(sharing.getInfo('course-a')).toMatchObject({ code: null, status: 'not-shared' })
  })
})

const followed = { driveKey: 'drive-b', followedSince: '', publisherId: 'teacher' }
const remote = (version: string, overrides = {}) => ({
  changelog: [
    { changes: [], cutAt: '', recommended: true, version: '0.2.0' },
    { changes: [], cutAt: '', version: '0.3.0' },
    { changes: [], cutAt: '', version: '1.0.0' },
  ].filter((entry) => entry.version <= version).reverse(),
  courseId: 'course-b',
  source: { driveKey: 'drive-b', publisher: { id: 'teacher' } },
  version,
  ...overrides,
})

describe('evaluateRemoteVersion', () => {
  it('offers a newer version with the release notes of every version the student would skip', () => {
    const verdict = evaluateRemoteVersion('course-b', followed, remote('0.3.0'), '0.1.0')

    expect(verdict).toMatchObject({ kind: 'update', update: { isMajor: false, version: '0.3.0' } })
    expect(verdict.kind === 'update' && verdict.update.changelog.map((entry) => entry.version)).toEqual(['0.3.0', '0.2.0'])
  })

  it('is recommended if any skipped version fixes mistakes, not only the newest', () => {
    expect(evaluateRemoteVersion('course-b', followed, remote('0.3.0'), '0.1.0')).toMatchObject({
      update: { recommended: true },
    })
    expect(evaluateRemoteVersion('course-b', followed, remote('0.3.0'), '0.2.0')).toMatchObject({
      update: { recommended: false },
    })
  })

  it('marks a major version bump as a big update', () => {
    expect(evaluateRemoteVersion('course-b', followed, remote('1.0.0'), '0.3.0')).toMatchObject({
      update: { isMajor: true },
    })
  })

  it('ignores the same or an older version, another course, or a version it cannot read', () => {
    expect(evaluateRemoteVersion('course-b', followed, remote('0.2.0'), '0.2.0')).toEqual({ kind: 'none' })
    expect(evaluateRemoteVersion('course-b', followed, remote('0.2.0'), '0.3.0')).toEqual({ kind: 'none' })
    expect(evaluateRemoteVersion('course-b', followed, remote('0.3.0', { courseId: 'other' }), '0.1.0')).toEqual({
      kind: 'none',
    })
    expect(evaluateRemoteVersion('course-b', followed, remote('latest'), '0.1.0')).toEqual({ kind: 'none' })
  })

  it('refuses a newer version that names another source than the one recorded at import', () => {
    const otherDrive = remote('0.3.0', { source: { driveKey: 'drive-x', publisher: { id: 'teacher' } } })
    const otherPublisher = remote('0.3.0', { source: { driveKey: 'drive-b', publisher: { id: 'someone' } } })

    expect(evaluateRemoteVersion('course-b', followed, otherDrive, '0.1.0')).toEqual({ kind: 'refused', version: '0.3.0' })
    expect(evaluateRemoteVersion('course-b', followed, otherPublisher, '0.1.0')).toEqual({ kind: 'refused', version: '0.3.0' })
  })
})

describe('describeUpdate: "Finish on this version"', () => {
  const pending = (version: string, recommended: boolean) => ({
    ...followed,
    pendingUpdate: { changelog: [], isMajor: false, recommended, version },
  })

  it('shows an update prominently until the student finishes on their version', () => {
    expect(describeUpdate(pending('0.3.0', false))?.visibility).toBe('prominent')
    expect(
      describeUpdate({ ...pending('0.3.0', false), dismissedUpdateVersion: '0.3.0', finishOnVersion: true })?.visibility,
    ).toBe('quiet')
  })

  it('still shows a recommended update once more, and a newer recommended one again', () => {
    const finished = { dismissedUpdateVersion: '0.2.0', finishOnVersion: true }

    expect(describeUpdate({ ...pending('0.3.0', true), ...finished })?.visibility).toBe('prominent')
    expect(describeUpdate({ ...pending('0.3.0', true), ...finished, dismissedUpdateVersion: '0.3.0' })?.visibility).toBe(
      'quiet',
    )
  })
})

describe('course sharing: updates', () => {
  const imported = {
    followed: { 'course-b': { driveKey: 'drive-b', followedSince: '', publisherId: 'teacher' } },
    published: {},
  }

  it('records an update when the drive changes, and applies it on request', async () => {
    const downloadUpdate = vi.fn(async () => ({ changedFiles: [{ key: '/section/lesson.md', op: 'change' }] }))
    const { sharing, state } = setup({
      initial: imported,
      worker: { checkUpdate: vi.fn(async () => remote('0.3.0')), downloadUpdate },
    })

    sharing.onDriveChanged('drive-b')
    await flush()
    expect(sharing.getInfo('course-b').update).toMatchObject({ kind: 'recommended', version: '0.3.0' })

    sharing.finishOnVersion('course-b')
    await expect(sharing.applyUpdate('course-b')).resolves.toEqual({
      changedFiles: ['/section/lesson.md'],
      version: '0.3.0',
    })
    expect(downloadUpdate).toHaveBeenCalledWith('drive-b', '/staging')
    expect(state().followed['course-b']).toMatchObject({ finishOnVersion: false, pendingUpdate: null })
  })

  it('records a refused update and never applies it', async () => {
    const { sharing } = setup({
      initial: imported,
      worker: {
        checkUpdate: vi.fn(async () => remote('0.3.0', { source: { driveKey: 'drive-x', publisher: { id: 'x' } } })),
      },
    })

    await sharing.checkForUpdate('course-b')

    expect(sharing.getInfo('course-b')).toMatchObject({ refusedUpdate: { version: '0.3.0' }, update: null })
    await expect(sharing.applyUpdate('course-b')).rejects.toThrow(/no update/)
  })

  it('checks again when the drive changes during a check, so a startup check can\'t swallow the news', async () => {
    let finishFirst!: (value: ReturnType<typeof remote>) => void
    const checkUpdate = vi
      .fn()
      // The startup check: started before the teacher was connected, answers "nothing new".
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValue(remote('0.3.0'))
    const { sharing } = setup({ initial: imported, worker: { checkUpdate } })

    const startupCheck = sharing.checkForUpdate('course-b')
    sharing.onDriveChanged('drive-b') // arrives while that check is running
    await flush() // let the first check reach the worker
    finishFirst(remote('0.1.0'))
    await startupCheck

    expect(checkUpdate).toHaveBeenCalledTimes(2)
    expect(sharing.getInfo('course-b').update?.version).toBe('0.3.0')
  })

  it('looks for updates to imported courses at startup', async () => {
    const checkUpdate = vi.fn(async () => remote('0.2.0'))
    const { sharing } = setup({ initial: imported, worker: { checkUpdate } })

    await sharing.start()

    expect(checkUpdate).toHaveBeenCalledWith('drive-b')
    expect(sharing.listUpdates()).toMatchObject({ 'course-b': { version: '0.2.0' } })
  })
})
