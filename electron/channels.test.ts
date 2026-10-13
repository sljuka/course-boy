import { describe, expect, it, vi } from 'vitest'

import type { ProgramCourse, ProgramManifest } from '../src/lib/program-package'
import { createChannels, describeForStudent } from './channels'

const CODE_A = 'a'.repeat(52)
const CODE_B = 'b'.repeat(52)
const CHANNEL_CODE = 'c'.repeat(52)

function entry(courseId: string, code: string): ProgramCourse {
  return {
    code,
    courseId,
    snapshot: { locales: { en: { description: '', title: courseId } }, publisherId: null, supportedLocales: ['en'], version: '0.2' },
  }
}

function setup({ canPublish = true } = {}) {
  const channels = new Map<string, ProgramManifest>()
  let ownId: string | null = null
  let channelCode: string | null = null
  const published: { code: string; courseId: string; listed: boolean | undefined }[] = []
  const publish = vi.fn(async () => {
    channelCode = CHANNEL_CODE
    return { code: CHANNEL_CODE }
  })
  const reshareCourses = vi.fn()
  const service = createChannels({
    canPublish: () => canPublish,
    channelCode: () => channelCode,
    courseEntry: async (courseId, code) => entry(courseId, code),
    createChannel: async (title) => {
      const id = `channel${channels.size}abcdefgh`.slice(0, 16)
      channels.set(id, {
        banner: null,
        courses: [],
        defaultLocale: 'en',
        formatVersion: 1,
        id,
        kind: 'channel',
        locales: { en: { description: '', title } },
        logo: null,
        programs: [],
        supportedLocales: ['en'],
        theme: null,
        updatedAt: '',
      })
      return id
    },
    initialName: () => 'Ana',
    publish,
    publishedCourses: () => published,
    readChannel: async (programId) => channels.get(programId) ?? null,
    readOwnChannelId: () => ownId,
    reshareCourses,
    writeChannel: async (manifest) => void channels.set(manifest.id, manifest),
    writeOwnChannelId: (programId) => (ownId = programId),
  })
  const channel = () => (ownId ? channels.get(ownId)! : null)
  return { channel, publish, published, reshareCourses, service }
}

describe('channels (SLJ-31)', () => {
  it('creates the channel once, named after the Publisher name or nickname', async () => {
    const { channel, service } = setup()
    const { programId } = await service.own()
    expect(await service.own()).toEqual({ programId })
    expect(channel()?.locales.en?.title).toBe('Ana')
  })

  it('lists the courses chosen for it, newest first, and puts it online', async () => {
    const { channel, publish, published, reshareCourses, service } = setup()
    published.push({ code: CODE_A, courseId: 'course-a', listed: true })
    await service.sync()
    expect(channel()?.courses.map((course) => course.courseId)).toEqual(['course-a'])
    expect(publish).toHaveBeenCalledTimes(1)
    // Its first time online: the course can now name it.
    expect(reshareCourses).toHaveBeenCalledWith(['course-a'])
    expect(service.codeForCourse('course-a')).toBe(CHANNEL_CODE)

    published.push({ code: CODE_B, courseId: 'course-b', listed: true })
    await service.sync()
    expect(channel()?.courses.map((course) => course.courseId)).toEqual(['course-b', 'course-a'])

    // Unchanged: not published again.
    await service.sync()
    expect(publish).toHaveBeenCalledTimes(2)

    published[0].listed = false
    await service.sync()
    expect(channel()?.courses.map((course) => course.courseId)).toEqual(['course-b'])
    expect(service.codeForCourse('course-a')).toBeNull()
  })

  it('leaves out courses published before channels, and makes no channel for none', async () => {
    const { channel, publish, published, service } = setup()
    published.push({ code: CODE_A, courseId: 'course-a', listed: undefined })
    await service.sync()
    expect(channel()).toBeNull()
    expect(publish).not.toHaveBeenCalled()
  })

  it("keeps the list but doesn't publish while the identity is locked", async () => {
    const { channel, publish, published, service } = setup({ canPublish: false })
    published.push({ code: CODE_A, courseId: 'course-a', listed: true })
    await service.sync()
    expect(channel()?.courses).toHaveLength(1)
    expect(publish).not.toHaveBeenCalled()
  })
})

describe('describeForStudent', () => {
  const manifest = (courses: ProgramCourse[]) => ({ courses, kind: 'channel' }) as ProgramManifest

  it('is only verified once the channel is here and lists the course', () => {
    expect(describeForStudent(null, 'course-a', null)).toBeNull()
    expect(describeForStudent(CHANNEL_CODE, 'course-a', null)).toEqual({
      code: CHANNEL_CODE,
      listed: null,
      programId: null,
      title: null,
      verified: false,
    })
    const here = { programId: 'channel-1', title: 'Ana' }
    expect(describeForStudent(CHANNEL_CODE, 'course-a', { ...here, manifest: manifest([entry('course-a', CODE_A)]) })).toMatchObject({
      title: 'Ana',
      verified: true,
    })
    expect(describeForStudent(CHANNEL_CODE, 'course-a', { ...here, manifest: manifest([entry('course-b', CODE_B)]) })).toMatchObject({
      verified: false,
    })
  })
})
