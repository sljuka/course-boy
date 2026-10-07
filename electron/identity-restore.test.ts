import { describe, expect, it, vi } from 'vitest'

import { createIdentityRestoreService, GAP_LIMIT, type FoundCourse, type IdentityRestoreState } from './identity-restore'

function workerError(code: string, message = code) {
  return Object.assign(new Error(message), { code })
}

// Course numbers online among students, and the course each one is.
type Online = Record<number, { courseId: string; title: string; publisherId?: string }>

function setup({
  currentPublisherId = 'publisher-boris' as string | null,
  hasPublishedCourses = false,
  filePath = '/backups/ana.matko-identity' as string | null,
  online = { 0: { courseId: 'aaaaaaaaaaaaaaaa', title: 'Fractions' }, 2: { courseId: 'bbbbbbbbbbbbbbbb', title: 'Verbs' } } as Online,
  onDevice = {} as Record<string, string>,
} = {}) {
  let state: IdentityRestoreState = {}
  let staging = 0
  const deps = {
    chooseFile: vi.fn(async () => filePath),
    courseOnDevice: vi.fn(async (courseId: string) => (onDevice[courseId] ? { title: onDevice[courseId] } : null)),
    createStagingPath: vi.fn(async () => `/courses/.recover-staging-${staging++}`),
    currentPublisherId: vi.fn(() => currentPublisherId),
    hasPublishedCourses: vi.fn(async () => hasPublishedCourses),
    installIdentity: vi.fn(async (_text: string, _key: Buffer) => {}),
    landCourse: vi.fn(async (input: { courseId: string; stagingPath: string; version: string }) => ({
      title: Object.values(online).find((course) => course.courseId === input.courseId)?.title ?? '',
    })),
    now: () => new Date('2026-10-07T12:00:00Z'),
    onCourseFound: vi.fn(),
    readFile: vi.fn(async () => '{"format":"matko-identity"}'),
    removeStaging: vi.fn(async () => {}),
    store: { read: () => state, write: (next: IdentityRestoreState) => (state = next) },
    worker: {
      findCourse: vi.fn(async ({ index }: { index: number }): Promise<FoundCourse> => {
        const course = online[index]
        if (!course) throw workerError('NOT_FOUND')
        return {
          courseId: course.courseId,
          driveKey: `drive-${index}`,
          publicId: `public-${index}`,
          publisherId: course.publisherId ?? 'publisher-ana',
          version: '0.2.0',
        }
      }),
      openIdentity: vi.fn(async (_text: string, password: string) => {
        if (password !== 'correct horse') throw workerError('WRONG_PASSWORD')
        return { key: Buffer.alloc(32, 7), publisherId: 'publisher-ana' }
      }),
      readIdentityBackup: vi.fn(async () => ({ createdAt: '2026-10-01T09:00:00Z', publisherId: 'publisher-ana' })),
    },
  }

  const service = createIdentityRestoreService(deps)
  return {
    deps,
    // Picks the file and restores it, then waits for the search to finish.
    restore: async (password = 'correct horse') => {
      await service.chooseFile()
      const result = await service.restore(password)
      await service.whenSearched()
      return result
    },
    service,
    state: () => state,
  }
}

describe('identity restore', () => {
  it('shows whose identity the chosen file holds, before asking for the password', async () => {
    const { service } = setup()

    expect(await service.chooseFile()).toEqual({
      file: { createdAt: '2026-10-01T09:00:00Z', fileName: 'ana.matko-identity', publisherId: 'publisher-ana' },
    })
  })

  it('reports a file that is not an identity file, or from a newer app, as a code', async () => {
    const { deps, service } = setup()

    deps.worker.readIdentityBackup.mockRejectedValueOnce(workerError('INVALID_FILE'))
    expect(await service.chooseFile()).toEqual({ error: 'invalidFile' })

    deps.worker.readIdentityBackup.mockRejectedValueOnce(workerError('UNSUPPORTED_VERSION'))
    expect(await service.chooseFile()).toEqual({ error: 'unsupportedVersion' })

    expect(await service.restore('correct horse')).toEqual({ error: 'noFile' })
  })

  it('does nothing when the teacher cancels the file dialog', async () => {
    const { deps, service } = setup({ filePath: null })

    expect(await service.chooseFile()).toEqual({ cancelled: true })
    expect(deps.readFile).not.toHaveBeenCalled()
  })

  it('installs the file and finds the courses by number, past gaps, up to the gap limit', async () => {
    const { deps, restore, service } = setup()

    expect(await restore()).toEqual({ restored: true })
    expect(deps.installIdentity).toHaveBeenCalledWith('{"format":"matko-identity"}', expect.any(Buffer))

    // 0 and 2 are online; 1 is a gap. After 2, GAP_LIMIT more misses end it.
    const looked = deps.worker.findCourse.mock.calls.map(([input]) => input.index).sort((a, b) => a - b)
    expect(looked).toEqual(Array.from({ length: 2 + GAP_LIMIT + 1 }, (_, index) => index))

    expect(deps.landCourse).toHaveBeenCalledWith({
      courseId: 'bbbbbbbbbbbbbbbb',
      stagingPath: expect.stringContaining('.recover-staging-'),
      version: '0.2.0',
    })
    // Shared again only once it has landed, with its number and code.
    expect(deps.onCourseFound).toHaveBeenCalledWith({
      courseId: 'bbbbbbbbbbbbbbbb',
      driveKey: 'drive-2',
      publicId: 'public-2',
      publicIndex: 2,
    })
    expect(service.getStatus()).toEqual({
      courses: [
        { id: 'aaaaaaaaaaaaaaaa', title: 'Fractions' },
        { id: 'bbbbbbbbbbbbbbbb', title: 'Verbs' },
      ],
      publisherId: 'publisher-ana',
      restoredAt: '2026-10-07T12:00:00.000Z',
      searching: false,
    })
    // Misses leave no staging folder behind.
    expect(deps.removeStaging).toHaveBeenCalledTimes(GAP_LIMIT + 1)
  })

  it('says so on a wrong password, and changes nothing', async () => {
    const { deps, restore, state } = setup()

    expect(await restore('wrong')).toEqual({ error: 'wrongPassword' })
    expect(deps.installIdentity).not.toHaveBeenCalled()
    expect(deps.worker.findCourse).not.toHaveBeenCalled()
    expect(state()).toEqual({})
  })

  it('refuses when this profile already put courses online with another identity', async () => {
    const { deps, restore } = setup({ hasPublishedCourses: true })

    expect(await restore()).toEqual({ error: 'alreadyPublishing' })
    expect(deps.installIdentity).not.toHaveBeenCalled()
  })

  it("restores this profile's own identity again; its courses here count as found", async () => {
    const { deps, restore, service } = setup({
      currentPublisherId: 'publisher-ana',
      hasPublishedCourses: true,
      onDevice: { aaaaaaaaaaaaaaaa: 'Fractions' },
    })

    expect(await restore()).toEqual({ restored: true })
    expect(deps.landCourse).toHaveBeenCalledTimes(1)
    expect(deps.landCourse.mock.calls[0][0].courseId).toBe('bbbbbbbbbbbbbbbb')
    expect(service.getStatus()?.courses.map((course) => course.id)).toEqual(['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb'])
  })

  it("doesn't count a course another publisher signed", async () => {
    const { deps, restore, service } = setup({
      online: { 0: { courseId: 'aaaaaaaaaaaaaaaa', publisherId: 'someone-else', title: 'Fractions' } },
    })

    await restore()
    expect(deps.landCourse).not.toHaveBeenCalled()
    expect(service.getStatus()?.courses).toEqual([])
  })

  it('"Look again" finds a course that was offline the first time', async () => {
    const online: Online = {}
    const { deps, restore, service } = setup({ online })
    await restore()
    expect(service.getStatus()?.courses).toEqual([])

    online[0] = { courseId: 'aaaaaaaaaaaaaaaa', title: 'Fractions' }
    service.searchAgain()
    await service.whenSearched()
    expect(deps.landCourse).toHaveBeenCalledTimes(1)
    expect(service.getStatus()?.courses).toEqual([{ id: 'aaaaaaaaaaaaaaaa', title: 'Fractions' }])
  })

  it('has no status before anything was restored', () => {
    const { service } = setup()
    expect(service.getStatus()).toBeNull()
  })
})
