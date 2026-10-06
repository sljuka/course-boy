import { describe, expect, it, vi } from 'vitest'

import { createIdentityRestoreService, recoveryTransferId, type IdentityRestoreState } from './identity-restore'

function workerError(code: string, message = code) {
  return Object.assign(new Error(message), { code })
}

function setup({ hasPublishedCourses = false, filePath = '/backups/ana.matko-identity' as string | null } = {}) {
  let state: IdentityRestoreState = {}
  const timers: (() => void)[] = []
  const events: string[] = []
  const deps = {
    chooseFile: vi.fn(async () => filePath),
    createStagingPath: vi.fn(async (courseId: string) => `/courses/.recover-staging-${courseId}`),
    hasPublishedCourses: vi.fn(async () => hasPublishedCourses),
    installRestoredStore: vi.fn(async () => {
      events.push('install')
    }),
    landCourse: vi.fn(async (_input: { courseId: string; stagingPath: string; version: string }) => {}),
    now: () => new Date('2026-10-06T12:00:00Z'),
    onCourseRecovered: vi.fn(),
    onIdentityRestored: vi.fn(),
    prepareRestoredStore: vi.fn(async () => '/profile/p2p-restore'),
    readFile: vi.fn(async () => '{"format":"matko-identity"}'),
    removeStaging: vi.fn(async () => {}),
    setTimer: (callback: () => void) => {
      timers.push(callback)
      return { cancel: () => {} }
    },
    store: { read: () => state, write: (next: IdentityRestoreState) => (state = next) },
    worker: {
      getTransfer: vi.fn(async () => null),
      readIdentityBackup: vi.fn(async () => ({ createdAt: '2026-10-01T09:00:00Z', publisherId: 'publisher-ana' })),
      recoverCourse: vi.fn(async (courseId: string) => ({
        driveKey: `drive-${courseId}`,
        publisherId: 'publisher-ana',
        version: '0.2.0',
      })),
      restoreIdentity: vi.fn(async () => {
        events.push('restore')
        return {
          courses: [
            { id: 'aaaaaaaaaaaaaaaa', title: 'Fractions' },
            { id: 'bbbbbbbbbbbbbbbb', title: 'Verbs' },
          ],
          publisherId: 'publisher-ana',
        }
      }),
    },
  }

  return {
    deps,
    events,
    // Lets the background recoveries started by restore() finish.
    flush: () => new Promise((resolve) => setTimeout(resolve, 0)),
    runTimers: () => timers.splice(0).forEach((run) => run()),
    service: createIdentityRestoreService(deps),
    state: () => state,
  }
}

describe('identity restore', () => {
  it('shows whose backup the chosen file is, before asking for the password', async () => {
    const { deps, service } = setup()

    expect(await service.chooseFile()).toEqual({
      file: { createdAt: '2026-10-01T09:00:00Z', fileName: 'ana.matko-identity', publisherId: 'publisher-ana' },
    })
    expect(deps.worker.readIdentityBackup).toHaveBeenCalledWith('{"format":"matko-identity"}')
  })

  it('reports a file that is not a backup, or from a newer app, as a code', async () => {
    const { deps, service } = setup()

    deps.worker.readIdentityBackup.mockRejectedValueOnce(workerError('INVALID_FILE'))
    expect(await service.chooseFile()).toEqual({ error: 'invalidFile' })

    deps.worker.readIdentityBackup.mockRejectedValueOnce(workerError('UNSUPPORTED_VERSION'))
    expect(await service.chooseFile()).toEqual({ error: 'unsupportedVersion' })

    // Nothing was chosen: restoring asks for a file first.
    expect(await service.restore('password')).toEqual({ error: 'noFile' })
  })

  it('does nothing when the teacher cancels the file dialog', async () => {
    const { deps, service } = setup({ filePath: null })

    expect(await service.chooseFile()).toEqual({ cancelled: true })
    expect(deps.readFile).not.toHaveBeenCalled()
  })

  it('installs the identity, counts it as consented and backed up, and brings every course back', async () => {
    const { deps, events, flush, service, state } = setup()
    await service.chooseFile()

    expect(await service.restore('correct horse')).toEqual({ restored: { courseCount: 2 } })
    expect(deps.worker.restoreIdentity).toHaveBeenCalledWith({
      password: 'correct horse',
      targetPath: '/profile/p2p-restore',
      text: '{"format":"matko-identity"}',
    })
    expect(events).toEqual(['restore', 'install'])
    expect(deps.onIdentityRestored).toHaveBeenCalledWith({
      backupCreatedAt: '2026-10-01T09:00:00Z',
      courseIds: ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb'],
    })

    await flush()
    expect(deps.worker.recoverCourse).toHaveBeenCalledWith(
      'aaaaaaaaaaaaaaaa',
      '/courses/.recover-staging-aaaaaaaaaaaaaaaa',
      recoveryTransferId('aaaaaaaaaaaaaaaa'),
    )
    expect(deps.landCourse).toHaveBeenCalledWith({
      courseId: 'aaaaaaaaaaaaaaaa',
      stagingPath: '/courses/.recover-staging-aaaaaaaaaaaaaaaa',
      version: '0.2.0',
    })
    // Shared again only once it's landed: never from a history it hasn't caught up with.
    expect(deps.onCourseRecovered).toHaveBeenCalledWith('aaaaaaaaaaaaaaaa', 'drive-aaaaaaaaaaaaaaaa')
    expect(state().courses?.map((course) => course.state)).toEqual(['restored', 'restored'])
    expect(await service.getStatus()).toMatchObject({
      publisherId: 'publisher-ana',
      restoredAt: '2026-10-06T12:00:00.000Z',
    })
  })

  it('says so on a wrong password, and changes nothing', async () => {
    const { deps, service, state } = setup()
    await service.chooseFile()
    deps.worker.restoreIdentity.mockRejectedValueOnce(workerError('WRONG_PASSWORD'))

    expect(await service.restore('wrong')).toEqual({ error: 'wrongPassword' })
    expect(deps.installRestoredStore).not.toHaveBeenCalled()
    expect(deps.onIdentityRestored).not.toHaveBeenCalled()
    expect(state()).toEqual({})
  })

  it("refuses when this profile already put courses online with its own identity", async () => {
    const { deps, service } = setup({ hasPublishedCourses: true })
    await service.chooseFile()

    expect(await service.restore('correct horse')).toEqual({ error: 'alreadyPublishing' })
    expect(deps.worker.restoreIdentity).not.toHaveBeenCalled()
    expect(deps.installRestoredStore).not.toHaveBeenCalled()
  })

  it('keeps a course waiting and tries again later when bringing it back fails', async () => {
    const { deps, flush, runTimers, service, state } = setup()
    deps.worker.recoverCourse.mockRejectedValueOnce(new Error('Timed out reading /course.json'))
    await service.chooseFile()
    await service.restore('correct horse')
    await flush()

    expect(deps.removeStaging).toHaveBeenCalledWith('/courses/.recover-staging-aaaaaaaaaaaaaaaa')
    expect(state().courses?.find((course) => course.id === 'aaaaaaaaaaaaaaaa')?.state).toBe('waiting')

    runTimers()
    await flush()
    expect(state().courses?.find((course) => course.id === 'aaaaaaaaaaaaaaaa')?.state).toBe('restored')
  })

  it("refuses a course whose drive names someone else's identity", async () => {
    const { deps, flush, service, state } = setup()
    deps.worker.recoverCourse.mockResolvedValue({ driveKey: 'drive', publisherId: 'someone-else', version: '0.2.0' })
    await service.chooseFile()
    await service.restore('correct horse')
    await flush()

    expect(deps.landCourse).not.toHaveBeenCalled()
    expect(state().courses?.every((course) => course.state === 'waiting')).toBe(true)
  })

  it('carries on with courses not back yet when the profile opens again', async () => {
    const { deps, flush, service } = setup()
    deps.store.write({
      courses: [
        { id: 'aaaaaaaaaaaaaaaa', state: 'restored', title: 'Fractions' },
        { id: 'bbbbbbbbbbbbbbbb', state: 'waiting', title: 'Verbs' },
      ],
      publisherId: 'publisher-ana',
      restoredAt: '2026-10-06T12:00:00.000Z',
    })

    service.resume()
    await flush()
    expect(deps.worker.recoverCourse).toHaveBeenCalledTimes(1)
    expect(deps.worker.recoverCourse.mock.calls[0][0]).toBe('bbbbbbbbbbbbbbbb')
  })

  it('has no status before anything was restored', async () => {
    const { service } = setup()
    expect(await service.getStatus()).toBeNull()
  })
})
